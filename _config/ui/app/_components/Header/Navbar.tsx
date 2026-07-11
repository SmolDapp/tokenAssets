'use client';
import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import {SelectContent, SelectItem, SelectTrigger, SelectValue} from '@components/ui/select';
import {useChain} from '@contexts/WithChain';
import {useSettings} from '@contexts/WithSettings';
import Grid from '@icons/grid.svg';
import List from '@icons/list.svg';
import {Select} from '@radix-ui/react-select';
import {CHAINS} from '@utils/constants';
import {withSearch} from '@utils/helpers';
import {useRouter, useSearchParams} from 'next/navigation';

import type {ReactElement} from 'react';

// The view cookie is read server-side, so SSR and the client agree — no mount guard needed
// (a callback-style mount check would never re-render, leaving list users a stale grid icon).
function GridOrListIcon(): ReactElement {
	const {view} = useSettings();

	if (view === 'grid') {
		return <Grid className={'size-6 min-h-6 min-w-6'} />;
	}

	return <List className={'size-6 min-h-6 min-w-6'} />;
}

export function NavBar(): ReactElement {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {view, handleViewChange} = useSettings();
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

	return (
		<div className={'flex items-center justify-end gap-2 max-md:hidden'}>
			<button
				type={'button'}
				aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
				className={cn(
					'flex size-10 items-center justify-center rounded-sm',
					'bg-transparent text-white transition-colors hover:bg-primary-light'
				)}
				onClick={handleViewChange}>
				<GridOrListIcon />
			</button>
			<Select value={chain.id} onValueChange={handleChainChange}>
				<SelectTrigger
					className={cn(
						'h-10 w-[154px] rounded-sm bg-transparent text-white uppercase transition-colors',
						'hover:bg-primary-light',
						'data-[state=open]:bg-primary-light'
					)}>
					<p className={'sr-only'}>{'Select network'}</p>
					<SelectValue>
						<span className={'flex items-center gap-2'}>
							<ChainLogo id={chain.id} />
							<span className={'font-medium text-xs tracking-normal'}>{chain.name}</span>
						</span>
					</SelectValue>
				</SelectTrigger>
				<SelectContent className={'uppercase'}>
					{CHAINS.map(network => (
						<SelectItem key={network.id} value={network.id}>
							<span className={'flex items-center gap-2'}>
								<ChainLogo id={network.id} />
								{network.name}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
