import {Octokit} from '@octokit/core';
import {Resvg} from '@resvg/resvg-js';
import {CHAINS} from '@utils/constants';
import {
	type TSubmissionInput,
	buildInfoJson,
	parseTags,
	toFolderAddress,
	validateSubmission
} from '@utils/tokenSubmission';
import {findToken} from '@utils/tokens.server';
import {getToken} from 'next-auth/jwt';
import {NextResponse} from 'next/server';
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

function renderPngBase64(svg: string, size: number): string {
	const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: size}});
	return Buffer.from(resvg.render().asPng()).toString('base64');
}

// A logo must be roughly square. Rejecting extreme aspect ratios also bounds the rasterized
// height: fitTo width caps width, and a bounded ratio then caps height — so no crafted SVG can
// request a giant pixmap that OOMs the function, and we never ship a wrong-shaped CDN artifact.
function isSquareEnough(svg: string): boolean {
	const {width, height} = new Resvg(svg);
	if (!width || !height) {
		return false;
	}
	const ratio = width / height;
	return ratio >= 0.5 && ratio <= 2;
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
	const validationErrors = validateSubmission(input);
	if (validationErrors.length > 0) {
		return NextResponse.json({error: validationErrors[0].message}, {status: 400});
	}

	const svg = `${input.svgText.trim()}\n`;
	const folderAddress = toFolderAddress(input.address);
	// Reject addresses already in the CDN before opening a PR — mirrors the client-side guard so a
	// direct API call (bypassing the disabled button) can't open a duplicate-address PR either.
	if (findToken(input.chainID, folderAddress)) {
		return NextResponse.json({error: 'This token already exists in the CDN.'}, {status: 409});
	}
	const folder = `tokens/${input.chainID}/${folderAddress}`;
	const infoJson = buildInfoJson(input, parseTags(body.tags || ''));
	const label = input.symbol.trim() || input.address;

	// Explorer links so a reviewer can eyeball the token + check the contract is verified in one click.
	let explorerLine = '- **Explorer:** not available for this chain';
	if (chain.explorer) {
		explorerLine = `- **Explorer:** [token page](${chain.explorer}/token/${input.address}) · [contract code](${chain.explorer}/address/${input.address}#code)`;
	}

	let png32 = '';
	let png128 = '';
	try {
		if (!isSquareEnough(svg)) {
			return NextResponse.json({error: 'The logo must be roughly square.'}, {status: 400});
		}
		png32 = renderPngBase64(svg, 32);
		png128 = renderPngBase64(svg, 128);
	} catch {
		return NextResponse.json({error: 'Could not rasterize the SVG to PNG.'}, {status: 400});
	}

	const [owner, repoName] = repo.split('/');
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

	try {
		const pr = await octokit.createPullRequest({
			owner,
			repo: repoName,
			// Not forceFork: contributors with push access (org members) get a branch on the base repo
			// directly — no fork, so no createRef-on-fork `repo`-scope escalation. Contributors WITHOUT push
			// are still auto-forked by the plugin, so their PR still comes from their own fork.
			forceFork: false,
			title: `Add ${label} on ${chain.name}`,
			body: [
				'Submitted via the Token Assets submit form.',
				'',
				`- **Chain:** ${chain.name} (\`${input.chainID}\`)`,
				`- **Address:** \`${input.address}\``,
				`- **Symbol:** ${input.symbol} · **Decimals:** ${input.decimals}`,
				`- **Project:** <${input.website.trim()}>`,
				explorerLine
			].join('\n'),
			base,
			head: `submit/${input.chainID}-${folderAddress}-${Date.now()}`,
			changes: [
				{
					commit: `feat: add ${label} on ${chain.name}`,
					files: {
						[`${folder}/logo.svg`]: svg,
						[`${folder}/logo-32.png`]: {content: png32, encoding: 'base64'},
						[`${folder}/logo-128.png`]: {content: png128, encoding: 'base64'},
						[`${folder}/info.json`]: infoJson
					}
				}
			]
		});
		const url = pr?.data?.html_url;
		if (!url) {
			return NextResponse.json({error: 'No changes to submit — this token may already exist.'}, {status: 409});
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
