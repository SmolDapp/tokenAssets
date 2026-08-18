import {TokenDrawerHost} from '@components/TokenDrawerHost';
import {TokenList} from '@components/TokenList';
import {DEFAULT_CHAIN, findChainBySlug} from '@utils/constants';
import {redirect} from 'next/navigation';
import {type ReactElement, type ReactNode, Suspense} from 'react';

type TChainLayoutProps = {
	children: ReactNode;
	params: Promise<{chain?: string}>;
};

// The list and the drawer are both mounted here rather than in the pages, because a layout survives
// child-segment changes: /[chain], /[chain]/[address] and /[chain]/[other] all keep this instance
// alive. So opening, swapping or closing a token never remounts the grid (and never replays the
// logo enter animations), and the drawer opens straight off the URL's address segment.
//
// `children` renders nothing on every route below — the pages exist only to carry metadata and to
// reject an unknown token — but it stays rendered so those checks run on soft navigation too.
//
// The unknown-chain redirect lives here, not in `page.tsx`, so it also covers /unknown/0xabc.
export default async function ChainLayout({children, params}: TChainLayoutProps): Promise<ReactElement> {
	const {chain: chainSlug} = await params;
	if (!findChainBySlug(chainSlug)) {
		redirect(`/${DEFAULT_CHAIN.slug}`);
	}

	return (
		<>
			<Suspense>
				<TokenList />
			</Suspense>
			<Suspense>
				<TokenDrawerHost />
			</Suspense>
			{children}
		</>
	);
}
