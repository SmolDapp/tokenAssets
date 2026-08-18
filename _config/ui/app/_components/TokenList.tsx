'use client';

import {GridView} from '@components/GridView';
import {Spinner} from '@components/Spinner';
import {TxResult} from '@components/TxResult';
import {Button} from '@components/ui/button';
import {useChain} from '@contexts/WithChain';
import {useTokens} from '@hooks/useTokens';
import {tokenPageURI, withSearch} from '@utils/helpers';
import {isValidAddress} from '@utils/tokenSubmission';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import type {ReactElement} from 'react';
import {useCallback, useMemo} from 'react';

export function TokenList(): ReactElement {
	const searchParams = useSearchParams();
	const {chain} = useChain();

	const searchQuery = searchParams.get('search') || '';
	const {tokens, isLoading, hasError, hasNextPage, fetchNextPage} = useTokens(chain.id, searchQuery);

	// Each card is a real link to the token path, which the drawer host mounted alongside this list
	// turns into an overlay; any active search is kept in the query so the list behind the drawer
	// stays filtered.
	//
	// Keyed off the serialized query rather than the searchParams object, whose identity changes on
	// every navigation: this keeps the callback stable, so the grid does not re-render (and reload
	// every logo) when only the route around it moved.
	const searchString = searchParams.toString();
	const buildTokenHref = useCallback(
		(address: string): string => {
			return withSearch(tokenPageURI(chain.slug, address), searchString);
		},
		[chain.slug, searchString]
	);

	// Carry the browsed chain (and the search term when it is itself an address) into the submit
	// form so it opens pre-scoped to what the user was looking at instead of defaulting to Ethereum.
	const submitHref = useMemo(() => {
		const params = new URLSearchParams({chain: chain.slug});
		const trimmedSearch = searchQuery.trim();
		if (trimmedSearch && isValidAddress(chain.id, trimmedSearch)) {
			params.set('address', trimmedSearch);
		}
		return `/submit?${params.toString()}`;
	}, [chain.slug, chain.id, searchQuery]);

	return (
		<div className={'w-full'}>
			{isLoading && (
				<div className={'my-16 flex w-full items-center justify-center'}>
					<Spinner />
				</div>
			)}
			{!isLoading && hasError && (
				<TxResult
					message={
						<div>
							<p className={'font-semibold text-lg text-primary'}>{'COULD NOT LOAD TOKENS.'}</p>
							<p className={'text-sm text-subtle'}>
								{'A network error prevented loading the token list. Reload the page to retry.'}
							</p>
						</div>
					}
				/>
			)}
			{!isLoading && !hasError && tokens.length === 0 && (
				<TxResult
					message={
						<div>
							<p className={'font-semibold text-lg text-primary'}>{'TOKENS NOT FOUND.'}</p>
							<p className={'text-sm text-subtle'}>
								{'Contribute to Token Assets. Submit the missing logo.'}
							</p>
						</div>
					}
					action={
						<Button
							asChild
							className={'bg-primary text-white hover:bg-primary-light'}
							size={'lg'}>
							<Link href={submitHref}>{'ADD TOKEN LOGO'}</Link>
						</Button>
					}
				/>
			)}
			{tokens.length > 0 && (
				<GridView
					tokens={tokens}
					buildHref={buildTokenHref}
					hasNextPage={hasNextPage}
					onLoadMore={fetchNextPage}
				/>
			)}
		</div>
	);
}
