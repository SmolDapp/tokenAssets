import {TokenDrawerRoute} from '@components/TokenDrawerRoute';
import {TokenList} from '@components/TokenList';
import {findChainBySlug} from '@utils/constants';
import {tokenPageURI, truncateAddress} from '@utils/helpers';
import {findToken} from '@utils/tokens.server';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import type {ReactElement} from 'react';

type TTokenPageProps = {
	params: Promise<{chain: string; address: string}>;
};

export async function generateMetadata({params}: TTokenPageProps): Promise<Metadata> {
	const {chain: chainSlug, address} = await params;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		return {};
	}
	const token = findToken(chain.id, address);
	if (!token) {
		return {};
	}

	const label = token.symbol || truncateAddress(token.address, 6);
	let named = '';
	if (token.name) {
		named = ` (${token.name})`;
	}
	const title = `${label}${named} logo on ${chain.name} | Token Assets`;
	const description = `Download the ${label} token logo on ${chain.name} as SVG or PNG from the Token Assets CDN — free, no API key.`;
	const url = tokenPageURI(chain.slug, token.address);
	const image = `/api/og/${chain.slug}/${token.address}`;
	return {
		title,
		description,
		alternates: {canonical: url},
		openGraph: {title, description, url, type: 'website', images: [{url: image, width: 1200, height: 630}]},
		twitter: {card: 'summary_large_image', title, description, images: [image]}
	};
}

// A token has no standalone page — it only ever renders as a drawer over the chain list. On a soft
// navigation the `@drawer` slot intercepts and keeps the list mounted; on a direct hit (shared link,
// search result) we render the list here and open the drawer for this address. The SEO metadata
// above is preserved either way.
export default async function TokenPage({params}: TTokenPageProps): Promise<ReactElement> {
	const {chain: chainSlug, address} = await params;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		notFound();
	}
	if (!findToken(chain.id, address)) {
		notFound();
	}

	return (
		<>
			<TokenList />
			<TokenDrawerRoute
				address={address}
				direct
			/>
		</>
	);
}
