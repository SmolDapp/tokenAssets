'use client';

import {TokenDrawerWrapper} from '@components/TokenDrawer';
import {useChain} from '@contexts/WithChain';
import {setDrawerOpen} from '@hooks/useDrawerOpen';
import {useTokens} from '@hooks/useTokens';
import {useRouter} from 'next/navigation';
import {type ReactElement, useEffect, useState} from 'react';

// The token detail is only ever a drawer over the chain list — there is no standalone token page.
// Shared by the soft-nav interceptor (`@drawer/(.)[address]`) and the direct-hit page (`[address]`):
// both open the token as a drawer above the list, reading it from the client cache the list warmed.
// Only the close destination differs — see `direct`.
export function TokenDrawerRoute({address, direct}: {address: string; direct?: boolean}): ReactElement {
	const router = useRouter();
	const {chain} = useChain();
	const {findToken, isLoading, hasError} = useTokens(chain.id);
	const [isOpen, setIsOpen] = useState(true);

	// Flag the drawer as mounted so the header search / palette treat this as a soft-nav drawer
	// (list underneath) rather than a hard-loaded token page.
	useEffect(() => {
		setDrawerOpen(true);
		return () => setDrawerOpen(false);
	}, []);

	// Once the chain list has loaded (or failed), a missing token must not leave the drawer
	// spinning forever — show an honest state the user can dismiss.
	let emptyState: ReactElement | undefined;
	if (!isLoading && (hasError || !findToken(address))) {
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

	// A soft-nav interception is popped with back() to restore the bare chain URL. A direct hit has
	// no interception to pop, so it navigates to the chain list instead.
	function handleClosed(): void {
		if (direct) {
			router.replace(`/${chain.slug}`);
			return;
		}
		router.back();
	}

	return (
		<TokenDrawerWrapper
			token={findToken(address) || null}
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			onClosed={handleClosed}
			emptyState={emptyState}
		/>
	);
}
