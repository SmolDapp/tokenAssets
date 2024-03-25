import {NextResponse} from 'next/server';

import type {NextRequest} from 'next/server';

export const config = {
	matcher: '/api/token/:path*'
};

export function middleware(req: NextRequest): NextResponse | Response {
	const githubBaseURL = 'https://raw.githubusercontent.com/SmolDapp/tokenAssets/main/tokens/';
	const newURL = new URL(`${githubBaseURL}${req.nextUrl.pathname.toLowerCase().replace('/api/token/', '')}`);
	console.log(newURL);
	// return NextResponse.next();
	return NextResponse.redirect(newURL, {status: 308});
}
