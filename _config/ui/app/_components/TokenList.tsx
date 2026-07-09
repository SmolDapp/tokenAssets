'use client';

import {GridView} from '@components/GridView';
import {ListView} from '@components/ListView';
import {TokenDrawerWrapper} from '@components/TokenDrawer';
import {TxResult} from '@components/TxResult';
import {Button} from '@components/ui/button';
import {useChain} from '@contexts/WithChain';
import {useTokens} from '@hooks/useTokens';
import {GITHUB_URI} from '@utils/constants';
import {useSettings} from 'app/_contexts/WithSettings';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Fragment, useCallback, useEffect, useMemo, useRef} from 'react';

import type {TToken} from '@utils/types';
import type {ReactElement} from 'react';

function TokensDisplay({
	tokens,
	view,
	hasNextPage,
	fetchNextPage,
	handleTokenSelect
}: {
	tokens: TToken[];
	view: 'grid' | 'list';
	hasNextPage: boolean;
	fetchNextPage: () => void;
	handleTokenSelect: (address: string | null) => void;
}): ReactElement {
	if (view === 'grid') {
		return (
			<GridView
				tokens={tokens}
				onClick={handleTokenSelect}
				hasNextPage={hasNextPage}
				onLoadMore={fetchNextPage}
			/>
		);
	}
	return (
		<Fragment>
			<div className={'hidden md:block'}>
				<ListView
					tokens={tokens}
					onClick={handleTokenSelect}
					hasNextPage={hasNextPage}
					onLoadMore={fetchNextPage}
				/>
			</div>
			<div className={'md:hidden'}>
				<GridView
					tokens={tokens}
					onClick={handleTokenSelect}
					hasNextPage={hasNextPage}
					onLoadMore={fetchNextPage}
				/>
			</div>
		</Fragment>
	);
}

export function TokenList(): ReactElement {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {chain} = useChain();
	const {view} = useSettings();

	const searchQuery = searchParams.get('search') || '';
	const selectedTokenAddress = searchParams.get('token');

	const {tokens, isLoading, hasNextPage, fetchNextPage, findToken} = useTokens(chain.id, searchQuery);

	// Keep a live ref to searchParams so handleTokenSelect stays referentially stable
	// and selecting a token does not re-render the whole grid (which reloads logos).
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;

	const handleTokenSelect = useCallback(
		(address: string | null): void => {
			const params = new URLSearchParams(searchParamsRef.current.toString());
			if (address) {
				params.set('token', address);
			} else {
				params.delete('token');
			}
			router.push(`?${params.toString()}`, {scroll: false});
		},
		[router]
	);

	const selectedToken = useMemo(() => {
		if (!selectedTokenAddress) {
			return null;
		}
		return findToken(selectedTokenAddress) || null;
	}, [findToken, selectedTokenAddress]);

	useEffect(() => {
		if (!!selectedTokenAddress && !isLoading && !selectedToken) {
			handleTokenSelect(null);
		}
	}, [selectedToken, isLoading, selectedTokenAddress, handleTokenSelect]);

	return (
		<div className={'w-full'}>
			{!isLoading && tokens.length === 0 && (
				<TxResult
					state={'error'}
					message={
						<div>
							<p className={'font-semibold text-lg text-primary'}>{'TOKENS NOT FOUND.'}</p>
							<p className={'text-sm text-subtle'}>
								{'Contribute to Token Assets. Submit the missing logo on GitHub.'}
							</p>
						</div>
					}
					action={
						<Link
							href={GITHUB_URI}
							target={'_blank'}
							rel={'noopener noreferrer'}>
							<Button
								className={'bg-primary text-white hover:bg-primary-light'}
								size={'lg'}>
								{'ADD TOKEN LOGO'}
							</Button>
						</Link>
					}
				/>
			)}
			{tokens.length > 0 && (
				<TokensDisplay
					tokens={tokens}
					view={view}
					hasNextPage={hasNextPage}
					fetchNextPage={fetchNextPage}
					handleTokenSelect={handleTokenSelect}
				/>
			)}

			<TokenDrawerWrapper
				token={selectedToken}
				isOpen={!!selectedTokenAddress}
				onClose={() => handleTokenSelect(null)}
			/>
		</div>
	);
}
