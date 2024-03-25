import {NextResponse} from 'next/server';

import type {NextRequest} from 'next/server';

export const config = {
	matcher: '/api/token/:path*'
};

export function middleware(req: NextRequest): NextResponse | Response {
	const githubBaseURL = 'https://raw.githubusercontent.com/SmolDapp/tokenAssets/main';
	const pathname = req.nextUrl.pathname.toLowerCase();
	const splitURL = pathname.split('/');
	const [/*_root*/, /*_api*/, /*_token*/, /*chainID*/, tokenAddress, filenameWithArgs] = splitURL;

	//remove any query parameters
	const [filename] = filenameWithArgs.split('?');
	console.log(tokenAddress, filename, splitURL);
	const isSVG = filename === 'logo.svg';
	const isPNG = filename === 'logo-32.png' || filename === 'logo-128.png';
	if (!isSVG && !isPNG) {
		if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
			const newURL = new URL(`${githubBaseURL}/_config/nodeAPI/public/gas-token.png`);
			return NextResponse.redirect(newURL, {status: 308});
		}
		const newURL = new URL(`${githubBaseURL}/_config/nodeAPI/public/not-found.png`);
		return NextResponse.redirect(newURL, {status: 308});
	}


	const newURL = new URL(`${githubBaseURL}/tokens/${pathname.replace('/api/token/', '')}`);
	return NextResponse.redirect(newURL, {status: 308});
}
