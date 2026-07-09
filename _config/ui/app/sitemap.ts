import {CHAINS, SITE_URI} from '@utils/constants';
import {tokenPageURI} from '@utils/helpers';
import {readChainTokens} from '@utils/tokens.server';

import type {MetadataRoute} from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const entries: MetadataRoute.Sitemap = [{url: SITE_URI, changeFrequency: 'weekly', priority: 1}];

	for (const chain of CHAINS) {
		entries.push({url: `${SITE_URI}/${chain.slug}`, changeFrequency: 'weekly', priority: 0.8});

		for (const token of readChainTokens(chain.id)) {
			const entry: MetadataRoute.Sitemap[number] = {
				url: `${SITE_URI}${tokenPageURI(chain.slug, token.address)}`,
				changeFrequency: 'monthly',
				priority: 0.5
			};
			if (token.addedAt) {
				entry.lastModified = new Date(token.addedAt * 1000);
			}
			entries.push(entry);
		}
	}

	return entries;
}
