import {NextResponse} from 'next/server';

import type {NextRequest} from 'next/server'; 

export function middleware(request: NextRequest): NextResponse {
	const {pathname} = request.nextUrl;
  
	// Handle token routes without /api prefix
	if (pathname.match(/^\/tokens?\/\d+\/0x[a-fA-F0-9]+\/[^/]+$/)) {
		const newPath = `/api${pathname}`;
		return NextResponse.rewrite(new URL(newPath, request.url));
	} 
  
	// Handle chain routes without /api prefix
	if (pathname.match(/^\/chains?\/\d+\/[^/]+$/)) {
		const newPath = `/api${pathname}`;
		return NextResponse.rewrite(new URL(newPath, request.url));
	}
  
	return NextResponse.next();
}

export const config = {
	matcher: [
		'/token/:path*',
		'/tokens/:path*',
		'/chain/:path*',
		'/chains/:path*'
	]
};
