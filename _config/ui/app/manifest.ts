import {BRAND_GREEN} from '@utils/constants';

import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Token Assets',
		short_name: 'Token Assets',
		description:
			'A unified CDN for cryptocurrency token assets. Browse token logos across multiple chains, served as SVG and PNG with pragmatic access.',
		start_url: '/',
		display: 'standalone',
		background_color: BRAND_GREEN,
		theme_color: BRAND_GREEN,
		icons: [{src: '/icon.svg', type: 'image/svg+xml', sizes: 'any'}]
	};
}
