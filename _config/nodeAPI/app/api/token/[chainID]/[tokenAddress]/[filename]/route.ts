
type TContext = {
	params: {
		chainID: string
		tokenAddress: string
		filename: string
	}
}
export async function GET(request: Request, context: TContext): Promise<Response> {
	const chainIDStr = (context?.params?.chainID || 1).toString();
	const tokenAddress = (context?.params?.tokenAddress || '').toLowerCase();
	const fileName = (context?.params?.filename || '').toLowerCase();
	if (!['logo.svg', 'logo-32.png', 'logo-128.png'].includes(fileName)) {
		return new Response('Not found', {status: 404});
	}

	const baseURI = process.env.NEXT_PUBLIC_VERCEL_URL || (request as any)?.nextUrl?.origin;
	const result = await fetch(`${baseURI}/${chainIDStr}/${tokenAddress}/${fileName}`);
	if (result.ok) {
		if (fileName.endsWith('.svg')) {
			return new Response(result.body, {headers: {'Content-Type': 'image/svg+xml'}});
		}
		return new Response(result.body, {headers: {'Content-Type': 'image/png'}});
	}
	return new Response('Not found', {status: 404});
}
