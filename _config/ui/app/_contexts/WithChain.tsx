'use client';

import type {TChainInfo} from '@utils/constants';
import {DEFAULT_CHAIN, findChainBySlug} from '@utils/constants';
import {useParams} from 'next/navigation';
import {createContext, type ReactElement, type ReactNode, useContext, useMemo} from 'react';

type TChainContext = {
	chain: TChainInfo;
};

const ChainContext = createContext<TChainContext | null>(null);

export function ChainProvider({children}: {children: ReactNode}): ReactElement {
	const params = useParams();
	const chainSlug = params?.chain as string | undefined;

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
