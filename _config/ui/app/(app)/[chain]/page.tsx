import {findChainBySlug} from '@utils/constants';
import type {Metadata} from 'next';

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

// The list itself is rendered by `layout.tsx`, which keeps it mounted while a token opens over it.
// This page exists to own the chain list's metadata; the unknown-chain redirect moved to the layout
// so it covers the token routes below too.
export default function ChainPage(): null {
	return null;
}
