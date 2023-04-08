import path from 'path';

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

	// const dir = path.resolve('./public', chainIDStr, tokenAddress);
	const image = path.join('/', chainIDStr, tokenAddress, fileName);
	// const logo = fs.readFileSync(`/${chainIDStr}/${tokenAddress}/${fileName}`);

	if (fileName.endsWith('.svg')) {
		return new Response(image, {headers: {'Content-Type': 'image/svg+xml'}});
	}
	return new Response(image, {headers: {'Content-Type': 'image/png'}});
}
