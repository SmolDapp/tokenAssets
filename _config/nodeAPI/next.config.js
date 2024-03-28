/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true
	},
	redirects() {
		return [
			{
				source: '/',
				destination: 'https://github.com/SmolDapp/tokenAssets',
				permanent: true,

			},
			{

				source: '/api/token/:chainID/:tokenAddress/:slug*',
				destination: 'https://raw.githubusercontent.com/SmolDapp/tokenAssets/main/tokens/:chainID/:tokenAddress/:slug*',
				permanent: true
			}
		];
	}
};

module.exports = nextConfig;
