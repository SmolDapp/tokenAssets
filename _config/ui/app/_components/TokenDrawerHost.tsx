'use client';

import {TokenDrawerWrapper} from '@components/TokenDrawer';
import {useChain} from '@contexts/WithChain';
import {useTokens} from '@hooks/useTokens';
import {consumeOpenedFromList} from '@utils/drawerOrigin';
import {withSearch} from '@utils/helpers';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import {type ReactElement, useEffect, useRef} from 'react';

// A token has no page of its own — it is a drawer over the chain list. This host is mounted once by
// `[chain]/layout.tsx` and stays mounted for the whole chain, opening and closing purely from the
// URL's address segment.
//
// It is deliberately NOT a parallel route slot. On a soft navigation Next keeps a slot's active
// segment rather than falling back to its `default`, so closing a slot-hosted drawer left it
// mounted forever: its cleanup never ran, and re-opening the same token produced the same segment
// key, so nothing remounted and the drawer never reopened. Deriving `isOpen` from the URL has no
// such state to leak, and it keeps vaul's enter/exit animations when moving between tokens.
export function TokenDrawerHost(): ReactElement {
	const router = useRouter();
	const params = useParams<{address?: string}>();
	const searchParams = useSearchParams();
	const {chain} = useChain();
	const {findToken, isLoading, hasError} = useTokens(chain.id);

	const address = params?.address || '';
	const isOpen = address.length > 0;

	// Latched when the drawer opens, so the close handler still knows where it came from.
	const openedFromList = useRef(false);
	useEffect(() => {
		if (address) {
			openedFromList.current = consumeOpenedFromList();
		}
	}, [address]);

	// Once the chain list has loaded (or failed), a missing token must not leave the drawer
	// spinning forever — show an honest state the user can dismiss.
	const token = isOpen ? findToken(address) : null;
	let emptyState: ReactElement | undefined;
	if (isOpen && !isLoading && (hasError || !token)) {
		emptyState = (
			<div className={'flex h-[400px] w-full flex-col items-center justify-center gap-2 p-6 text-center'}>
				<p className={'font-mono font-semibold text-black text-sm uppercase'}>
					{hasError ? 'Could not load token data' : 'Token not found on this chain'}
				</p>
				<p className={'font-mono text-subtle text-xs'}>
					{hasError ? 'Check your connection and try again.' : 'Verify the contract address and chain.'}
				</p>
			</div>
		);
	}

	// Popping is what makes the drawer part of history, so Back closes it and Forward reopens it.
	// It is only correct when the entry underneath really is this list, which holds for a card click
	// and nothing else: the palette pushes the token from a list URL that may not carry the search
	// yet, and a shared link or a reload has no list underneath at all — popping there would drop
	// the search, or walk off the site. Those navigate to the list instead, carrying the query,
	// since the list is filtered by it and closing must not unfilter it.
	//
	// `scroll: false` keeps the list where the user left it, which back() does for free.
	function handleClose(): void {
		if (openedFromList.current) {
			router.back();
			return;
		}
		router.replace(withSearch(`/${chain.slug}`, searchParams.toString()), {scroll: false});
	}

	return (
		<TokenDrawerWrapper
			token={token || null}
			isOpen={isOpen}
			onClose={handleClose}
			emptyState={emptyState}
		/>
	);
}
