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
	return <SubmitForm signedIn={Boolean(session?.accessToken)} />;
}
