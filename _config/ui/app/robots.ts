import {SITE_URI} from '@utils/constants';

import type {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {userAgent: '*', allow: '/'},
		sitemap: `${SITE_URI}/sitemap.xml`
	};
}
