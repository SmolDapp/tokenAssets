import {TokenList} from '@components/TokenList';
import {DEFAULT_CHAIN, findChainBySlug} from '@utils/constants';
import {truncateAddress} from '@utils/helpers';
import {findToken} from '@utils/tokens.server';
import {redirect} from 'next/navigation';
import {type ReactElement, Suspense} from 'react';

import type {Metadata} from 'next';

type TChainPageProps = {
	params: Promise<{chain?: string}>;
	searchParams: Promise<{[key: string]: string | string[] | undefined}>;
};

export async function generateMetadata({params, searchParams}: TChainPageProps): Promise<Metadata> {
	const {chain: chainSlug} = await params;
	const {token: tokenParam} = await searchParams;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		return {};
	}

	let address = '';
	if (typeof tokenParam === 'string') {
		address = tokenParam;
	}
	const token = findToken(chain.id, address);

	if (token) {
		const label = token.symbol || truncateAddress(token.address, 6);
		let named = '';
		if (token.name) {
			named = ` (${token.name})`;
		}
		const title = `${label}${named} logo on ${chain.name} | Token Assets`;
		const description = `Download the ${label} token logo on ${chain.name} as SVG or PNG from the Token Assets CDN — free, no API key.`;
		const url = `/${chain.slug}?token=${token.address}`;
		const image = `/api/og/${chain.slug}/${token.address}`;
		return {
			title,
			description,
			alternates: {canonical: url},
			openGraph: {title, description, url, type: 'website', images: [{url: image, width: 1200, height: 630}]},
			twitter: {card: 'summary_large_image', title, description, images: [image]}
		};
	}

	const title = `Token logos on ${chain.name} | Token Assets`;
	const description = `Browse ${chain.count.toLocaleString('en-US')} token logos on ${chain.name}, served as SVG and PNG from the Token Assets CDN.`;
	return {
		title,
		description,
		alternates: {canonical: `/${chain.slug}`},
		openGraph: {title, description, url: `/${chain.slug}`, type: 'website'}
	};
}

export default async function ChainPage({params}: TChainPageProps): Promise<ReactElement> {
	const {chain: chainSlug} = await params;
	const isChainSupported = findChainBySlug(chainSlug);

	if (!isChainSupported) {
		redirect(`/${DEFAULT_CHAIN.slug}`);
	}

	return (
		<Suspense>
			<TokenList />
		</Suspense>
	);
}
