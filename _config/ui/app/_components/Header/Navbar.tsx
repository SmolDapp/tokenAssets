'use client';
import {ChainSelector} from '@components/ChainSelector';
import {useChain} from '@contexts/WithChain';
import {CHAINS} from '@utils/constants';
import {withSearch} from '@utils/helpers';
import {useRouter, useSearchParams} from 'next/navigation';

import type {ReactElement} from 'react';

export function NavBar(): ReactElement {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {chain} = useChain();

	// Switching chains always lands on the bare chain list (dropping any open token), keeping
	// only the active search so the destination stays filtered.
	const handleChainChange = (value: string): void => {
		const network = CHAINS.find(c => c.id === value);
		if (!network) {
			return;
		}

		router.replace(withSearch(`/${network.slug}`, searchParams.toString()), {scroll: false});
	};

	const handleAddNetwork = (chainID: string): void => {
		router.push(`/submit/network/${chainID}`);
	};

	return (
		<div className={'flex items-center justify-end gap-2 max-md:hidden'}>
			<ChainSelector
				value={chain.id}
				onChange={handleChainChange}
				onAddNetwork={handleAddNetwork}
				align={'end'}
			/>
		</div>
	);
}
