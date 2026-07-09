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
	const {findToken} = useTokens(chain.id);
	const [isOpen, setIsOpen] = useState(true);

	return (
		<TokenDrawerWrapper
			token={findToken(address) || null}
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			onClosed={() => router.back()}
		/>
	);
}
