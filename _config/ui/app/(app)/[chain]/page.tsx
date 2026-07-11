import {TokenList} from '@components/TokenList';
import {DEFAULT_CHAIN, findChainBySlug} from '@utils/constants';
import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {type ReactElement, Suspense} from 'react';

type TChainPageProps = {
	params: Promise<{chain?: string}>;
};

export async function generateMetadata({params}: TChainPageProps): Promise<Metadata> {
	const {chain: chainSlug} = await params;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		return {};
	}

	const title = `Token logos on ${chain.name} | Token Assets`;
	const description = `Browse ${chain.count.toLocaleString('en-US')} token logos on ${
		chain.name
	}, served as SVG and PNG from the Token Assets CDN.`;
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
