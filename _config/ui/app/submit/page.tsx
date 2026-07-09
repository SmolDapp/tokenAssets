import {HeroPage} from '@components/HeroPage';
import {SubmitForm} from '@components/Submit/SubmitForm';
import {auth} from '@utils/auth';

import type {Metadata} from 'next';
import type {ReactElement} from 'react';

const DESCRIPTION =
	'Add a token logo to the Token Assets CDN. Upload an SVG, we read the on-chain metadata for you, and you get a ready-to-commit folder to open a pull request.';

export const metadata: Metadata = {
	title: 'Submit a token | Token Assets',
	description: DESCRIPTION,
	alternates: {canonical: '/submit'},
	openGraph: {title: 'Submit a token | Token Assets', description: DESCRIPTION, url: '/submit', type: 'website'}
};

export default async function SubmitPage(): Promise<ReactElement> {
	const session = await auth();
	return (
		<HeroPage
			tagline={'Open-source logo CDN'}
			heading={
				<>
					{'Submit a'}
					<br />
					{'token'}
				</>
			}
			description={
				'Point it at a contract and we read the on-chain metadata for you. Add a logo, sign in with GitHub, and we open a pull request against the CDN for you to review.'
			}
			stats={[
				{value: '1', label: 'Point to contract'},
				{value: '2', label: 'Add a logo'},
				{value: '3', label: 'Open a PR'}
			]}>
			<SubmitForm signedIn={Boolean(session?.user)} />
		</HeroPage>
	);
}
