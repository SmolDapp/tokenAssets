import {Octokit} from '@octokit/core';
import {Resvg} from '@resvg/resvg-js';
import {auth} from '@utils/auth';
import {CHAINS} from '@utils/constants';
import {isForbiddenSvg} from '@utils/svgSafety';
import {
	type TSubmissionInput,
	buildInfoJson,
	parseTags,
	toFolderAddress,
	validateSubmission
} from '@utils/tokenSubmission';
import {NextResponse} from 'next/server';
import {createPullRequest} from 'octokit-plugin-create-pull-request';

export const runtime = 'nodejs';

const SubmitOctokit = Octokit.plugin(createPullRequest);

// Best-effort in-memory throttle. Serverless instances don't share memory, so this only slows a single
// warm instance — real protection would be Vercel KV / Upstash + a captcha. The human PR review is the
// real backstop.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const recent = (rateHits.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
	recent.push(now);
	rateHits.set(ip, recent);
	return recent.length > RATE_MAX;
}

function renderPngBase64(svg: string, size: number): string {
	const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: size}});
	return Buffer.from(resvg.render().asPng()).toString('base64');
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
	const session = await auth();
	const token = session?.accessToken;
	if (!token) {
		return NextResponse.json({error: 'Sign in with GitHub to submit.'}, {status: 401});
	}

	const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
	if (isForbiddenSvg(input.svgText)) {
		return NextResponse.json(
			{error: 'The logo SVG contains a script, event handler, external link or embedded raster — vector only.'},
			{status: 400}
		);
	}

	const svg = `${input.svgText.trim()}\n`;
	const folderAddress = toFolderAddress(input.address);
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
		png32 = renderPngBase64(svg, 32);
		png128 = renderPngBase64(svg, 128);
	} catch {
		return NextResponse.json({error: 'Could not rasterize the SVG to PNG.'}, {status: 400});
	}

	const [owner, repoName] = repo.split('/');
	const octokit = new SubmitOctokit({auth: token});
	try {
		const pr = await octokit.createPullRequest({
			owner,
			repo: repoName,
			forceFork: true,
			title: `Add ${label} on ${chain.name}`,
			body: [
				'Submitted via the Token Assets submit form.',
				'',
				`- **Chain:** ${chain.name} (\`${input.chainID}\`)`,
				`- **Address:** \`${input.address}\``,
				`- **Symbol:** ${input.symbol} · **Decimals:** ${input.decimals}`,
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
		console.error('createPullRequest failed', error);
		return NextResponse.json(
			{error: 'Could not open the pull request — the server token may lack access to the repository.'},
			{status: 502}
		);
	}
}
