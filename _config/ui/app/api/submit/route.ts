import {Octokit} from '@octokit/core';
import {CHAINS} from '@utils/constants';
import {readBlobText, readFolderEntries} from '@utils/githubRepo.server';
import {mergeTokenInfo, parseInfoJson, serializeInfoJson, type TTokenInfo} from '@utils/infoJson';
import {isSquareEnough, outlineSvgText, renderPngBase64} from '@utils/svgRaster.server';
import {isForbiddenSvg} from '@utils/svgSafety';
import {
	isValidAddress,
	MAX_SVG_BYTES,
	parseTags,
	type TSubmissionInput,
	type TValidationScope,
	toFolderAddress,
	validateSubmission,
	validateTags
} from '@utils/tokenSubmission';
import {NextResponse} from 'next/server';
import {getToken} from 'next-auth/jwt';
import {createPullRequest} from 'octokit-plugin-create-pull-request';

export const runtime = 'nodejs';

const SubmitOctokit = Octokit.plugin(createPullRequest);

// Best-effort in-memory throttle. Serverless instances don't share memory, so this only slows a single
// warm instance — real protection would be Vercel KV / Upstash + a captcha. The human PR review is the
// real backstop.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const RATE_MAX_IPS = 10_000;
const rateHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const recent = (rateHits.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
	recent.push(now);
	rateHits.set(ip, recent);

	// Opportunistically drop buckets whose newest hit has aged out, so a long-lived warm instance
	// doesn't accumulate one array per distinct IP forever. Only sweeps once the map grows past a cap.
	if (rateHits.size > RATE_MAX_IPS) {
		for (const [key, times] of rateHits) {
			if (times.length === 0 || now - times[times.length - 1] >= RATE_WINDOW_MS) {
				rateHits.delete(key);
			}
		}
	}

	return recent.length > RATE_MAX;
}

// A label reaches the PR title, the commit message and the branch name. On an edit it comes from the
// file on disk, which predates the current validation rules, so it is not bound by them — and even a
// validated symbol may carry backticks or brackets that break out of a markdown code span.
function safeLabel(value: string, fallback: string): string {
	const cleaned = value.trim().replace(/[^A-Za-z0-9._+-]/g, '');
	if (!cleaned) {
		return fallback;
	}
	return cleaned.slice(0, 32);
}

// The project link is validated for scheme and whitespace but not for markdown. Left as-is it can close
// its own autolink and render an arbitrary link next to it, which is exactly what a reviewer reads.
function safeURL(value: string): string {
	return value
		.trim()
		.replace(/[<>`[\]()*_~|\\]/g, '')
		.slice(0, 200);
}

type TSubmitBody = {
	chainID?: string;
	address?: string;
	svg?: string;
	name?: string;
	symbol?: string;
	decimals?: string;
	description?: string;
	website?: string;
	tags?: string;
	// True only when the caller means to edit a token that already exists. Absent means "add a new
	// token", which keeps the old contract — and the old 409 — intact for every existing caller.
	isEdit?: boolean;
};

export async function POST(request: Request): Promise<Response> {
	const repo = process.env.GITHUB_SUBMIT_REPO || 'SmolDapp/tokenAssets';
	const base = process.env.GITHUB_SUBMIT_BASE || 'main';

	// The PR is opened AS the signed-in user, from their own fork — so the token is theirs, not a bot's.
	// Read it from the encrypted JWT (server-only); it is never exposed on the client session.
	const jwt = await getToken({
		req: request,
		secret: process.env.AUTH_SECRET,
		secureCookie: process.env.NODE_ENV === 'production'
	});
	const token = jwt?.accessToken as string | undefined;
	if (!token) {
		return NextResponse.json({error: 'Sign in with GitHub to submit.'}, {status: 401});
	}

	const ip =
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip')?.trim() ||
		'unknown';
	if (isRateLimited(ip)) {
		return NextResponse.json({error: 'Too many submissions — wait a minute and try again.'}, {status: 429});
	}

	let body: TSubmitBody;
	try {
		body = (await request.json()) as TSubmitBody;
	} catch {
		return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
	}

	const input: TSubmissionInput = {
		chainID: body.chainID || '',
		address: body.address || '',
		svgText: body.svg || '',
		name: body.name || '',
		symbol: body.symbol || '',
		decimals: body.decimals || '',
		description: body.description || '',
		website: body.website || ''
	};

	const chain = CHAINS.find(entry => entry.id === input.chainID);
	if (!chain) {
		return NextResponse.json({error: 'Unsupported chain.'}, {status: 400});
	}

	// Checked before the address is used to build any path: the strict form is what stops a "/" or a
	// backtick from injecting a folder or markdown further down.
	if (!isValidAddress(input.chainID, input.address)) {
		return NextResponse.json({error: 'Enter a valid contract address for the selected chain'}, {status: 400});
	}

	const isEdit = body.isEdit === true;
	const svg = `${input.svgText.trim()}\n`;
	const hasNewLogo = input.svgText.length > 0;
	const folderAddress = toFolderAddress(input.address);
	const folder = `tokens/${input.chainID}/${folderAddress}`;

	// An edit brings a logo only when it replaces one, never brings a project link for the many tokens
	// that have none, and carries name/symbol/decimals over from the base file untouched. Taking the flag
	// from the body is safe here because it only relaxes requirements: the folder cross-check below still
	// decides whether this really is an edit, so a caller cannot use it to slip a new token through.
	const scope: TValidationScope = {
		requireLogo: !isEdit,
		requireWebsite: !isEdit,
		requireMeta: !isEdit
	};
	const tags = parseTags(body.tags || '');
	const validationErrors = [...validateSubmission(input, scope), ...validateTags(tags)];
	if (validationErrors.length > 0) {
		return NextResponse.json({error: validationErrors[0].message}, {status: 400});
	}

	const [owner, repoName] = repo.split('/');
	if (!owner || !repoName) {
		return NextResponse.json({error: 'Server misconfiguration: invalid GITHUB_SUBMIT_REPO.'}, {status: 500});
	}
	const octokit = new SubmitOctokit({auth: token});

	// Pre-flight scope check. Opening the PR forks the repo and writes a branch (createRef); when the
	// OAuth token lacks the public_repo write scope, GitHub answers those writes with a confusing 404
	// (it hides existence rather than returning 403). Surface a clear "re-authenticate" message instead.
	// The usual cause is a stale authorization that predates the public_repo scope — GitHub keeps reusing
	// the old grant until the user revokes the app and signs in again.
	try {
		const probe = await octokit.request('GET /user');
		const scopeHeader = probe.headers['x-oauth-scopes'];
		if (typeof scopeHeader === 'string') {
			const grantedScopes = scopeHeader.split(',').map(scope => scope.trim());
			if (!grantedScopes.includes('public_repo') && !grantedScopes.includes('repo')) {
				return NextResponse.json(
					{
						error: 'Your GitHub authorization is missing the public_repo permission — sign out, revoke the app on GitHub, then sign in again.'
					},
					{status: 401}
				);
			}
		}
	} catch {
		return NextResponse.json(
			{error: 'Your GitHub authorization is no longer valid — sign in with GitHub again.'},
			{status: 401}
		);
	}

	// Existence is resolved against the live base repo, not against public/data/tokens/<id>.json: that
	// snapshot is committed at build time, so a token merged since the last deploy is invisible to it —
	// and writing a path that already exists updates it silently. Asking GitHub also compares the exact
	// case-sensitive folder, which is what a Solana address in a different case would otherwise slip past.
	let entries: Awaited<ReturnType<typeof readFolderEntries>>;
	try {
		entries = await readFolderEntries(octokit, owner, repoName, base, folder);
	} catch {
		return NextResponse.json({error: 'Could not read the token from GitHub — try again.'}, {status: 502});
	}
	const folderExists = entries !== null;

	if (!isEdit && folderExists) {
		return NextResponse.json({error: 'This token already exists in the CDN.'}, {status: 409});
	}
	if (isEdit && !folderExists) {
		return NextResponse.json(
			{error: 'This token is not on the CDN yet — submit it as a new token.'},
			{status: 404}
		);
	}

	// name/symbol/decimals come from the file on disk rather than from the request, so a crafted POST
	// cannot rename a token. A folder with no info.json has nothing to take them from, which would leave
	// the request as the only source — so an edit is refused there, exactly as it is when the file cannot
	// be parsed. Those folders are still reachable through a hand-written pull request.
	let baseInfo: TTokenInfo | null = null;
	if (isEdit) {
		const infoEntry = entries?.find(entry => entry.name === 'info.json');
		if (!infoEntry) {
			return NextResponse.json(
				{error: 'This token has no info.json yet — open a pull request manually to add one.'},
				{status: 400}
			);
		}
		let baseRaw: string;
		try {
			baseRaw = await readBlobText(octokit, owner, repoName, infoEntry.sha);
		} catch {
			return NextResponse.json({error: 'Could not read the token from GitHub — try again.'}, {status: 502});
		}
		baseInfo = parseInfoJson(baseRaw);
		if (!baseInfo) {
			return NextResponse.json(
				{error: "This token's info.json has a field this form cannot edit — open a pull request manually."},
				{status: 400}
			);
		}
	}

	const info = mergeTokenInfo({base: baseInfo, input, tags});
	const infoJson = serializeInfoJson(info);
	const label = safeLabel(info.symbol, input.address);

	// Explorer links so a reviewer can eyeball the token + check the contract is verified in one click.
	let explorerLine = '- **Explorer:** not available for this chain';
	if (chain.explorer) {
		explorerLine = `- **Explorer:** [token page](${chain.explorer}/token/${input.address}) · [contract code](${chain.explorer}/address/${input.address}#code)`;
	}

	// Skipped entirely when the edit keeps the current logo: feeding an empty string to resvg would throw
	// and surface as a misleading "could not rasterize". logo.svg is never written without both PNGs,
	// because the CI requires all three logo files together in a folder.
	let logoSvg = svg;
	let png32 = '';
	let png128 = '';
	if (hasNewLogo) {
		try {
			if (!isSquareEnough(svg)) {
				return NextResponse.json({error: 'The logo must be roughly square.'}, {status: 400});
			}
			// Outline before rasterizing so the committed SVG and its PNGs are the same shapes, and
			// neither needs the submitter's font to render.
			logoSvg = outlineSvgText(svg);
			png32 = renderPngBase64(logoSvg, 32);
			png128 = renderPngBase64(logoSvg, 128);
		} catch {
			return NextResponse.json({error: 'Could not rasterize the SVG to PNG.'}, {status: 400});
		}
		// Both checks passed on the submitted SVG, but outlining rewrites it: a text-heavy logo can grow
		// past the cap, and usvg re-encodes an embedded data URI as base64 — which the CI greps for. Re-run
		// them on the exact bytes we are about to commit so we never open a PR our own CI rejects.
		if (new TextEncoder().encode(logoSvg).length > MAX_SVG_BYTES) {
			return NextResponse.json(
				{error: 'The SVG is too complex — it exceeds 150KB once the text is outlined.'},
				{status: 400}
			);
		}
		if (isForbiddenSvg(logoSvg)) {
			return NextResponse.json(
				{
					error: 'The logo could not be converted safely — remove any embedded image from the SVG, or outline its text yourself before submitting.'
				},
				{status: 400}
			);
		}
	}

	const files: Record<string, string | {content: string; encoding: 'base64'}> = {
		[`${folder}/info.json`]: infoJson
	};
	if (hasNewLogo) {
		files[`${folder}/logo.svg`] = logoSvg;
		files[`${folder}/logo-32.png`] = {content: png32, encoding: 'base64'};
		files[`${folder}/logo-128.png`] = {content: png128, encoding: 'base64'};
	}

	let intro = 'Submitted via the Token Assets submit form.';
	let title = `Add ${label} on ${chain.name}`;
	let commit = `feat: add ${label} on ${chain.name}`;
	let branchPrefix = 'submit';
	let bodyLines = [
		`- **Chain:** ${chain.name} (\`${input.chainID}\`)`,
		`- **Address:** \`${input.address}\``,
		`- **Symbol:** ${safeLabel(input.symbol, '?')} · **Decimals:** ${input.decimals}`,
		`- **Project:** <${safeURL(input.website)}>`
	];
	if (isEdit) {
		intro = 'Edited via the Token Assets submit form.';
		title = `Update ${label} on ${chain.name}`;
		commit = `chore: update ${label} on ${chain.name}`;
		branchPrefix = 'edit';
		// An edit prints no field value. description legitimately contains newlines and markdown lists,
		// so interpolating it would let a submission forge extra body lines — a fake "- **Address:**"
		// above the real one, for instance. The diff shows the values anyway.
		let logoLine = '- **Logo:** unchanged';
		if (hasNewLogo) {
			logoLine = '- **Logo:** replaced';
		}
		bodyLines = [
			`- **Chain:** ${chain.name} (\`${input.chainID}\`)`,
			`- **Address:** \`${input.address}\``,
			`- **Folder:** \`${folder}\``,
			logoLine
		];
	}
	bodyLines.push(explorerLine);

	try {
		const pr = await octokit.createPullRequest({
			owner,
			repo: repoName,
			// Not forceFork: contributors with push access (org members) get a branch on the base repo
			// directly — no fork, so no createRef-on-fork `repo`-scope escalation. Contributors WITHOUT push
			// are still auto-forked by the plugin, so their PR still comes from their own fork.
			forceFork: false,
			title,
			body: [intro, '', ...bodyLines].join('\n'),
			base,
			// Without this the plugin happily commits an unchanged tree, pushes a branch and opens a PR
			// with an empty diff. Submitting an edit without changing anything is the most likely accident
			// in this flow, so it has to fail before any ref is written.
			createWhenEmpty: false,
			head: `${branchPrefix}/${input.chainID}-${folderAddress}-${Date.now()}`,
			changes: [
				{
					commit,
					files
				}
			]
		});
		const url = pr?.data?.html_url;
		if (!url) {
			return NextResponse.json({error: 'No changes to submit.'}, {status: 409});
		}
		return NextResponse.json({prUrl: url});
	} catch (error) {
		const httpError = error as {
			status?: number;
			message?: string;
			request?: {method?: string; url?: string};
			response?: {data?: unknown; headers?: Record<string, string | undefined>};
		};
		// Expand the octokit HttpError: default logging collapses request/response to "[Object]", hiding
		// exactly which GitHub call 404'd (fork? createRef? on which owner/repo?) and GitHub's own message.
		// The response headers disambiguate a write 404: SAML SSO (x-github-sso), an OAuth scope mismatch
		// (x-accepted-oauth-scopes vs x-oauth-scopes), or a plain permission block.
		const responseHeaders = httpError.response?.headers || {};
		console.error('createPullRequest failed', {
			status: httpError.status,
			request: `${httpError.request?.method} ${httpError.request?.url}`,
			message: httpError.message,
			ghError: JSON.stringify(httpError.response?.data),
			sso: responseHeaders['x-github-sso'],
			oauthScopes: responseHeaders['x-oauth-scopes'],
			acceptedOauthScopes: responseHeaders['x-accepted-oauth-scopes']
		});
		const status = httpError.status;
		const message = httpError.message || '';
		// An expired/revoked OAuth token surfaces as 401 — tell the user to re-authenticate.
		if (status === 401) {
			return NextResponse.json(
				{error: 'Your GitHub authorization is no longer valid — sign in with GitHub again.'},
				{status: 401}
			);
		}
		// 403 covers two very different cases: a secondary/abuse rate limit (retryable) vs a genuine
		// permission/OAuth-scope block. Route rate limits to 429 so the client says "wait and retry".
		if (status === 403) {
			if (/rate limit|abuse|secondary/i.test(message)) {
				return NextResponse.json(
					{error: 'GitHub is rate-limiting submissions — wait a minute and try again.'},
					{status: 429}
				);
			}
			return NextResponse.json(
				{error: 'Your GitHub authorization is no longer valid — sign in with GitHub again.'},
				{status: 401}
			);
		}
		return NextResponse.json(
			{error: 'Could not open the pull request — GitHub rejected the request.'},
			{status: 502}
		);
	}
}
