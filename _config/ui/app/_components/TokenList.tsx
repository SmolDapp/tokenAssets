'use client';

import {GridView} from '@components/GridView';
import {ListView} from '@components/ListView';
import {Spinner} from '@components/Spinner';
import {TxResult} from '@components/TxResult';
import {Button} from '@components/ui/button';
import {useChain} from '@contexts/WithChain';
import {useTokens} from '@hooks/useTokens';
import {GITHUB_URI} from '@utils/constants';
import {tokenPageURI, withSearch} from '@utils/helpers';
import {useSettings} from 'app/_contexts/WithSettings';
import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Fragment, useCallback, useRef} from 'react';

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
	handleTokenSelect: (address: string) => void;
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
	const {tokens, isLoading, hasError, hasNextPage, fetchNextPage} = useTokens(chain.id, searchQuery);

	// Keep a live ref to searchParams so handleTokenSelect stays referentially stable
	// and selecting a token does not re-render the whole grid (which reloads logos).
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;

	// Selecting a token navigates to its own path. On soft navigation this is intercepted
	// into the @drawer slot (drawer over the still-mounted list); any active search is kept
	// in the query so the list behind the drawer stays filtered.
	const handleTokenSelect = useCallback(
		(address: string): void => {
			const href = withSearch(tokenPageURI(chain.slug, address), searchParamsRef.current.toString());
			router.push(href, {scroll: false});
		},
		[router, chain.slug]
	);

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
								{'Contribute to Token Assets. Submit the missing logo on GitHub.'}
							</p>
						</div>
					}
					action={
						<Button asChild className={'bg-primary text-white hover:bg-primary-light'} size={'lg'}>
							<Link href={GITHUB_URI} target={'_blank'} rel={'noopener noreferrer'}>
								{'ADD TOKEN LOGO'}
							</Link>
						</Button>
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
		</div>
	);
}
