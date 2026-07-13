import {Octokit} from '@octokit/core';
import {findAddableChain} from '@utils/allChains.server';
import {isSquareEnough, renderPngBase64} from '@utils/svgRaster.server';
import {isForbiddenSvg} from '@utils/svgSafety';
import {NextResponse} from 'next/server';
import {getToken} from 'next-auth/jwt';
import {createPullRequest} from 'octokit-plugin-create-pull-request';

export const runtime = 'nodejs';

const SubmitOctokit = Octokit.plugin(createPullRequest);

// The conventional native/gas-token placeholder used across the CDN (see serveToken.go). Adding a
// network means adding its chain logo plus this native token — the ≥1-token entry that makes the
// chain surface in the index.
const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const RATE_MAX_IPS = 10_000;
const rateHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const recent = (rateHits.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
	recent.push(now);
	rateHits.set(ip, recent);

	// Drop buckets whose newest hit has aged out so a long-lived warm instance doesn't accumulate
	// one array per distinct IP forever. Only sweeps once the map grows past a cap.
	if (rateHits.size > RATE_MAX_IPS) {
		for (const [key, times] of rateHits) {
			if (times.length === 0 || now - times[times.length - 1] >= RATE_WINDOW_MS) {
				rateHits.delete(key);
			}
		}
	}

	return recent.length > RATE_MAX;
}

// Mirrors the token route + CI checks so we never open a PR verify-tokens.mjs would reject:
// a real vector, no scripts/rasters/external links, under 150KB, roughly square.
function validateLogoSvg(svg: string, which: string): string | null {
	if (!svg.includes('<svg')) {
		return `Upload the ${which} logo as an SVG file.`;
	}
	if (isForbiddenSvg(svg)) {
		return `The ${which} SVG must be a pure vector — no scripts, event handlers, external links or embedded rasters.`;
	}
	if (new TextEncoder().encode(svg).length > 153_600) {
		return `The ${which} SVG must be under 150KB.`;
	}
	return null;
}

type TNetworkBody = {
	chainID?: string;
	chainSvg?: string;
	nativeSvg?: string;
};

export async function POST(request: Request): Promise<Response> {
	const repo = process.env.GITHUB_SUBMIT_REPO || 'SmolDapp/tokenAssets';
	const base = process.env.GITHUB_SUBMIT_BASE || 'main';

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

	let body: TNetworkBody;
	try {
		body = (await request.json()) as TNetworkBody;
	} catch {
		return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
	}

	// The chain must be a known mainnet not already on the CDN — the only valid add target.
	const chain = findAddableChain(body.chainID);
	if (!chain) {
		return NextResponse.json(
			{error: 'This network cannot be added (unknown or already on the CDN).'},
			{status: 400}
		);
	}

	const chainSvg = `${(body.chainSvg || '').trim()}\n`;
	const nativeSvg = `${(body.nativeSvg || '').trim()}\n`;
	const chainError = validateLogoSvg(chainSvg, 'chain');
	if (chainError) {
		return NextResponse.json({error: chainError}, {status: 400});
	}
	const nativeError = validateLogoSvg(nativeSvg, 'native token');
	if (nativeError) {
		return NextResponse.json({error: nativeError}, {status: 400});
	}

	let chainPng32 = '';
	let chainPng128 = '';
	let nativePng32 = '';
	let nativePng128 = '';
	try {
		if (!isSquareEnough(chainSvg) || !isSquareEnough(nativeSvg)) {
			return NextResponse.json({error: 'Each logo must be roughly square.'}, {status: 400});
		}
		chainPng32 = renderPngBase64(chainSvg, 32);
		chainPng128 = renderPngBase64(chainSvg, 128);
		nativePng32 = renderPngBase64(nativeSvg, 32);
		nativePng128 = renderPngBase64(nativeSvg, 128);
	} catch {
		return NextResponse.json({error: 'Could not rasterize the SVG to PNG.'}, {status: 400});
	}

	const infoJson = `${JSON.stringify(
		{name: chain.nativeName, symbol: chain.nativeSymbol, decimals: chain.nativeDecimals},
		null,
		2
	)}\n`;
	const chainFolder = `chains/${chain.id}`;
	const tokenFolder = `tokens/${chain.id}/${NATIVE_TOKEN_ADDRESS}`;

	const [owner, repoName] = repo.split('/');
	const octokit = new SubmitOctokit({auth: token});

	// Pre-flight scope check — opening the PR forks + writes a branch; a token missing public_repo
	// gets a confusing 404 from GitHub, so surface a clear "re-authenticate" message instead.
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
			forceFork: false,
			title: `Add ${chain.name} network`,
			body: [
				'Submitted via the Token Assets add-a-network form.',
				'',
				`- **Chain:** ${chain.name} (\`${chain.id}\`)`,
				`- **Native token:** ${chain.nativeSymbol} · ${chain.nativeDecimals} decimals`,
				'',
				'Adds the chain logo and the native-token logo so the network surfaces on the CDN.'
			].join('\n'),
			base,
			head: `network/${chain.id}-${Date.now()}`,
			changes: [
				{
					commit: `feat: add ${chain.name} network`,
					files: {
						[`${chainFolder}/logo.svg`]: chainSvg,
						[`${chainFolder}/logo-32.png`]: {content: chainPng32, encoding: 'base64'},
						[`${chainFolder}/logo-128.png`]: {content: chainPng128, encoding: 'base64'},
						[`${tokenFolder}/logo.svg`]: nativeSvg,
						[`${tokenFolder}/logo-32.png`]: {content: nativePng32, encoding: 'base64'},
						[`${tokenFolder}/logo-128.png`]: {content: nativePng128, encoding: 'base64'},
						[`${tokenFolder}/info.json`]: infoJson
					}
				}
			]
		});
		const url = pr?.data?.html_url;
		if (!url) {
			return NextResponse.json({error: 'No changes to submit — this network may already exist.'}, {status: 409});
		}
		return NextResponse.json({prUrl: url});
	} catch (error) {
		const httpError = error as {
			status?: number;
			message?: string;
			request?: {method?: string; url?: string};
			response?: {data?: unknown; headers?: Record<string, string | undefined>};
		};
		// Expand the octokit HttpError so a write 404 (fork? createRef? scope mismatch?) is debuggable
		// in production instead of collapsing to "[Object]" — this flow is new and unproven live.
		const responseHeaders = httpError.response?.headers || {};
		console.error('createPullRequest (network) failed', {
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
		if (status === 401) {
			return NextResponse.json(
				{error: 'Your GitHub authorization is no longer valid — sign in with GitHub again.'},
				{status: 401}
			);
		}
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
