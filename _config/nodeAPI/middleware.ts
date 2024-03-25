import {NextResponse} from 'next/server';

import type {NextRequest} from 'next/server';

export const config = {
	matcher: '/api/token/:chainID/:tokenAddress/:filename'
};

export function middleware(req: NextRequest): NextResponse | Response {
	const githubBaseURL = 'https://raw.githubusercontent.com/SmolDapp/tokenAssets/main/tokens/';
	req.nextUrl.pathname = req.nextUrl.pathname.toLowerCase();
	const newURL = new URL(`${githubBaseURL}${req.nextUrl.pathname.replace('/api/token/', '')}`);
	return NextResponse.redirect(newURL, {status: 308});
}
