module.exports = {
	images: {
		remotePatterns: [{protocol: 'https', hostname: 'assets.smold.app'}]
	},
	serverExternalPackages: ['@resvg/resvg-js'],
	// The submit routes read these at runtime with `fs`, which the bundler cannot see. Without this
	// they are missing from the deployed function and resvg silently drops every glyph again.
	outputFileTracingIncludes: {
		'/api/submit': ['./app/_assets/fonts/**'],
		'/api/submit/network': ['./app/_assets/fonts/**']
	},
	// biome-ignore lint/suspicious/noExplicitAny: webpack config is untyped
	webpack(config: any) {
		// Grab the existing rule that handles SVG imports
		// biome-ignore lint/suspicious/noExplicitAny: webpack config is untyped
		const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.('.svg'));

		config.module.rules.push(
			// Reapply the existing rule, but only for svg imports ending in ?url
			{
				...fileLoaderRule,
				test: /\.svg$/i,
				resourceQuery: /url/ // *.svg?url
			},
			// Convert all other *.svg imports to React components
			{
				test: /\.svg$/i,
				issuer: fileLoaderRule.issuer,
				resourceQuery: {not: [...fileLoaderRule.resourceQuery.not, /url/]}, // exclude if *.svg?url
				use: ['@svgr/webpack']
			}
		);

		// Modify the file loader rule to ignore *.svg, since we have it handled now.
		fileLoaderRule.exclude = /\.svg$/i;

		return config;
	}
};
