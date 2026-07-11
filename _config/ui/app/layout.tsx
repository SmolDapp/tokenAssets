import {Toaster} from '@components/ui/toaster';
import {WithFonts} from '@components/WithFonts';
import {ChainProvider} from '@contexts/WithChain';
import {WithSettings} from '@contexts/WithSettings';
import {BRAND_GREEN, SITE_URI} from '@utils/constants';
import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import type {ReactElement, ReactNode} from 'react';

import '@styles/style.css';

const DESCRIPTION =
	'A unified CDN for cryptocurrency token assets. Browse token logos across multiple chains, served as SVG and PNG with pragmatic access.';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URI),
	title: 'Token Assets',
	description: DESCRIPTION,
	openGraph: {
		title: 'Token Assets',
		description: DESCRIPTION,
		url: `${SITE_URI}/`,
		siteName: 'Token Assets',
		locale: 'en_US',
		type: 'website'
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Token Assets',
		description: DESCRIPTION
	}
};

export const viewport: Viewport = {
	themeColor: BRAND_GREEN
};

export default async function RootLayout({children}: {children: ReactNode}): Promise<ReactElement> {
	const cookieStore = await cookies();
	const view = cookieStore.get('view');

	return (
		<html lang={'en'}>
			<body
				className={
					'bg-white [background-image:linear-gradient(to_right,#E6E6E6_1px,transparent_1px),linear-gradient(to_bottom,#E6E6E6_1px,transparent_1px)] [background-position:0_0] [background-size:12px_12px]'
				}>
				<WithFonts>
					<WithSettings cookieView={view?.value || 'grid'}>
						<ChainProvider>{children}</ChainProvider>
					</WithSettings>
					<Toaster />
				</WithFonts>
			</body>
		</html>
	);
}
