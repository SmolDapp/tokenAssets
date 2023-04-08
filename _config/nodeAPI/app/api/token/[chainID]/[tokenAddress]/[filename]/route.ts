import fs from 'fs';
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
	const image = path.resolve('/', chainIDStr, tokenAddress, fileName);
	console.log(image);
	const logo = fs.readFileSync(image);

	if (fileName.endsWith('.svg')) {
		return new Response(logo, {headers: {'Content-Type': 'image/svg+xml'}});
	}
	return new Response(logo, {headers: {'Content-Type': 'image/png'}});
}
