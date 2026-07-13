import {HeroPage} from '@components/HeroPage';
import {NetworkSubmitForm} from '@components/Submit/NetworkSubmitForm';
import {auth} from '@utils/auth';
import {findAddableChain} from '@utils/constants';

import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import type {ReactElement} from 'react';

const DESCRIPTION =
	'Add a network to the Token Assets CDN. Upload the chain logo and its native-token logo, sign in with GitHub, and we open a pull request against the CDN for you to review.';

export const metadata: Metadata = {
	title: 'Add a network | Token Assets',
	description: DESCRIPTION,
	robots: {index: false},
	openGraph: {
		title: 'Add a network | Token Assets',
		description: DESCRIPTION,
		type: 'website',
		images: ['/opengraph-image']
	}
};

type TAddNetworkPageProps = {
	params: Promise<{chainID: string}>;
};

export default async function AddNetworkPage({params}: TAddNetworkPageProps): Promise<ReactElement> {
	const {chainID} = await params;
	// Only a known mainnet not yet on the CDN is addable; anything else (already on the CDN, a
	// testnet, or an unknown id) has no add flow, so bounce back to the token submit page.
	const chain = findAddableChain(chainID);
	if (!chain) {
		redirect('/submit');
	}

	const session = await auth();
	return (
		<HeroPage
			tagline={'Open-source logo CDN'}
			heading={
				<>
					{'Submit a'}
					<br />
					{'network'}
				</>
			}
			description={
				'Pick a network that is not on the CDN yet, add its logo and its native-token logo, and we open a pull request against the CDN for you to review.'
			}
			stats={[
				{value: '1', label: 'Pick a network'},
				{value: '2', label: 'Add logos'},
				{value: '3', label: 'Open a PR'}
			]}>
			<NetworkSubmitForm chain={chain} signedIn={Boolean(session?.user)} />
		</HeroPage>
	);
}
