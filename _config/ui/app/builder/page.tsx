import {BrandMark} from '@components/BrandMark';
import {LogoBuilder} from '@components/Builder/LogoBuilder';

import type {Metadata} from 'next';
import type {ReactElement} from 'react';

const DESCRIPTION =
	'Build a token logo from a template. Pick the token being wrapped, pick the protocol decorating it, and get a 32×32 SVG ready to submit to the Token Assets CDN.';

export const metadata: Metadata = {
	title: 'Build a logo | Token Assets',
	description: DESCRIPTION,
	alternates: {canonical: '/builder'},
	openGraph: {
		title: 'Build a logo | Token Assets',
		description: DESCRIPTION,
		url: '/builder',
		type: 'website',
		images: ['/opengraph-image']
	}
};

// The dark shell is HeroPage's, minus the hero itself: the builder is a tool, so it starts at the
// top of the page instead of below a pitch. Swap back to <HeroPage> to restore the intro block.
export default function BuilderPage(): ReactElement {
	return (
		<main className={'relative flex min-h-screen w-full flex-col overflow-hidden bg-primary'}>
			<div
				aria-hidden={'true'}
				className={
					'pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]'
				}
			/>
			<header className={'relative z-40 w-full shrink-0 border-b border-white/10'}>
				<div
					className={
						'mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10'
					}>
					<BrandMark />
				</div>
			</header>

			<div
				className={
					'relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 md:px-10 md:py-10'
				}>
				<LogoBuilder />
			</div>
		</main>
	);
}
