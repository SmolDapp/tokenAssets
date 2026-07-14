'use client';

import {TokenDrawerRoute} from '@components/TokenDrawerRoute';
import {type ReactElement, use} from 'react';

// Intercepts a soft navigation to /[chain]/[address] and renders the token as a drawer above the
// still-mounted list. Closing pops the interception (router.back) to restore the bare chain URL.
export default function InterceptedTokenDrawer({params}: {params: Promise<{address: string}>}): ReactElement {
	const {address} = use(params);
	return <TokenDrawerRoute address={address} />;
}
