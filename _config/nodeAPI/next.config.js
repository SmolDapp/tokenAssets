/** @type {import('next').NextConfig} */
const nextConfig = {
	redirects() {
		return [
			{
				source: '/',
				destination: 'https://github.com/SmolDapp/tokenAssets',
				permanent: true
			}
		];
	}
};

module.exports = nextConfig;
