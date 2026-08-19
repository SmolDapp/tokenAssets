'use client';

import type {TChainInfo} from '@utils/constants';
import {DEFAULT_CHAIN, findChainBySlug} from '@utils/constants';
import {usePathname} from 'next/navigation';
import {createContext, type ReactElement, type ReactNode, useContext, useMemo} from 'react';

type TChainContext = {
	chain: TChainInfo;
};

const ChainContext = createContext<TChainContext | null>(null);

// Read off the pathname rather than useParams(). This provider sits in the root layout, which owns
// no dynamic segment, and useParams() there does not pick up `chain` when the router moves into
// `[chain]` from a route outside it — the context stayed on the default chain for the rest of the
// session. A hard load was fine, so the bug only showed on a click, and only from a page outside
// `[chain]` to a non-default chain. Nothing linked that way until /audit did.
//
// usePathname() always reflects the current URL, and the first segment is the chain slug wherever
// one exists; on /, /audit or /submit it matches nothing and the default stands, as before.
export function ChainProvider({children}: {children: ReactNode}): ReactElement {
	const pathname = usePathname();
	const chainSlug = pathname?.split('/')[1];

	const value = useMemo(() => {
		return {chain: findChainBySlug(chainSlug) || DEFAULT_CHAIN};
	}, [chainSlug]);

	return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useChain(): TChainContext {
	const context = useContext(ChainContext);
	if (!context) {
		throw new Error('useChain must be used within a ChainProvider');
	}
	return context;
}
