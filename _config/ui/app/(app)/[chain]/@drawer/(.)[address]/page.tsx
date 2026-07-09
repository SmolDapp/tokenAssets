'use client';

import {TokenDrawerWrapper} from '@components/TokenDrawer';
import {useChain} from '@contexts/WithChain';
import {useTokens} from '@hooks/useTokens';
import {useRouter} from 'next/navigation';
import {type ReactElement, use, useState} from 'react';

// Intercepts a soft navigation to /[chain]/[address] and renders the token as a drawer
// above the still-mounted list. The token is read from the client cache the list already
// warmed, so no refetch happens. `router.back()` pops the interception once the drawer has
// animated out, restoring the bare chain URL.
export default function InterceptedTokenDrawer({params}: {params: Promise<{address: string}>}): ReactElement {
	const {address} = use(params);
	const router = useRouter();
	const {chain} = useChain();
	const {findToken, isLoading, hasError} = useTokens(chain.id);
	const [isOpen, setIsOpen] = useState(true);

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

	return (
		<TokenDrawerWrapper
			token={findToken(address) || null}
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			onClosed={() => router.back()}
			emptyState={emptyState}
		/>
	);
}
