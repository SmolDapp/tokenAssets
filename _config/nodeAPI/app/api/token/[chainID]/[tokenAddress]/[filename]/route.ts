
type TContext = {
	params: {
		chainID: string
		tokenAddress: string
		filename: string
	}
}
async function resolveNotFound(request: Request): Promise<Response> {
	const fallback = new URL(request.url).searchParams.get('fallback');
	if (fallback === 'true') {
		const baseURI = (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : (request as any)?.nextUrl?.origin);
		const result = await fetch(`${baseURI}/not-found.png`);
		return new Response(result.body, {headers: {'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
	}

	if (fallback) {
		const result = await fetch(fallback);
		const contentTypeFromFallback = result.headers.get('Content-Type');
		if (contentTypeFromFallback?.startsWith('image/')) {
			console.warn(`Using fallback image for gas token: ${fallback}`);
			return new Response(result.body, {headers: {'Content-Type': contentTypeFromFallback, 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
		}
	}
	return new Response('Not found', {status: 404});
}

async function resolveGasToken(request: Request): Promise<Response> {
	const fallback = new URL(request.url).searchParams.get('fallback');
	if (fallback === 'true') {
		const baseURI = (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : (request as any)?.nextUrl?.origin);
		const result = await fetch(`${baseURI}/gas-token.png`);
		return new Response(result.body, {headers: {'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
	}
	if (fallback) {
		const result = await fetch(fallback);
		const contentTypeFromFallback = result.headers.get('Content-Type');
		if (contentTypeFromFallback?.startsWith('image/')) {
			console.warn(`Using fallback image for gas token: ${fallback}`);
			return new Response(result.body, {headers: {'Content-Type': contentTypeFromFallback, 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
		}
	}
	return new Response('Not found', {status: 404});
}

export async function GET(request: Request, context: TContext): Promise<Response> {
	const chainIDStr = (context?.params?.chainID || 1).toString();
	const tokenAddress = (context?.params?.tokenAddress || '').toLowerCase();
	const fileName = (context?.params?.filename || '').toLowerCase();
	if (!['logo.svg', 'logo-32.png', 'logo-128.png'].includes(fileName)) {
		if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
			return await resolveGasToken(request);
		}
		return await resolveNotFound(request);
	}

	const baseURI = (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : (request as any)?.nextUrl?.origin);
	const result = await fetch(`${baseURI}/${chainIDStr}/${tokenAddress}/${fileName}`);
	if (result.ok) {
		if (fileName.endsWith('.svg')) {
			return new Response(result.body, {headers: {'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
		}
		return new Response(result.body, {headers: {'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, must-revalidate'}});
	}

	if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
		return await resolveGasToken(request);
	}
	return await resolveNotFound(request);
}
