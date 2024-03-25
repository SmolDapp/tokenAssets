import {NextResponse} from 'next/server';

import type {NextRequest} from 'next/server';

export const config = {
	matcher: '/'
};

export function middleware(req: NextRequest): NextResponse | Response {
	//make sure the request is lowercase
	req.nextUrl.pathname = req.nextUrl.pathname.toLowerCase();
	return NextResponse.rewrite(req.nextUrl);
}
