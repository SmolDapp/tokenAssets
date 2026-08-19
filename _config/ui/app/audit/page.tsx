import {AuditReport} from '@components/Audit/AuditReport';
import {BrandMark} from '@components/BrandMark';

import type {Metadata} from 'next';
import type {ReactElement} from 'react';

const DESCRIPTION =
	'Cross-entry audit of the Token Assets corpus: one logo worn by unrelated tokens, one token drawn differently from chain to chain, and image sets that disagree with themselves.';

export const metadata: Metadata = {
	title: 'Audit | Token Assets',
	description: DESCRIPTION,
	alternates: {canonical: '/audit'},
	openGraph: {
		title: 'Audit | Token Assets',
		description: DESCRIPTION,
		url: '/audit',
		type: 'website',
		images: ['/opengraph-image']
	}
};

// Same dark shell as /builder: a tool, so it starts at the top of the page rather than below a
// pitch.
export default function AuditPage(): ReactElement {
	return (
		<main className={'relative flex min-h-screen w-full flex-col overflow-hidden bg-primary'}>
			<div
				aria-hidden={'true'}
				className={
					'pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]'
				}
			/>
			<header className={'relative z-40 w-full shrink-0 border-white/10 border-b'}>
				<div
					className={
						'mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10'
					}>
					<BrandMark />
				</div>
			</header>

			<div
				className={
					'relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-8 md:px-10 md:py-10'
				}>
				<div className={'space-y-1.5'}>
					<h1 className={'font-medium font-mono text-white text-xl uppercase tracking-[0.1em]'}>{'Audit'}</h1>
					<p className={'max-w-[70ch] font-mono text-sm text-white/45 leading-relaxed'}>
						{
							'The repo CI validates each token folder on its own. This looks at the corpus as a whole, where a different class of defect lives. Everything here is advisory: a finding is a question worth asking, not a verdict.'
						}
					</p>
				</div>
				<AuditReport />
			</div>
		</main>
	);
}
