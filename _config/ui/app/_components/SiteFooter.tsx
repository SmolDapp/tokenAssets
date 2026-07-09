import {GITHUB_URI, SMOLD_APP_URI} from '@utils/constants';
import Link from 'next/link';

import type {ReactElement} from 'react';

export function SiteFooter(): ReactElement {
	return (
		<footer className={'flex h-16 w-full items-center justify-between gap-2 bg-border-gray px-6 md:px-10'}>
			<div className={'flex items-center gap-1'}>
				<Link
					href={GITHUB_URI}
					target={'_blank'}
					rel={'noopener noreferrer'}
					className={
						'rounded-sm px-3 py-2 font-medium font-mono text-[#1A1A1A] text-[11px] uppercase tracking-[0.08em] transition-colors hover:bg-primary hover:text-white'
					}>
					{'Github'}
				</Link>
				<Link
					href={`${GITHUB_URI}#usage`}
					target={'_blank'}
					rel={'noopener noreferrer'}
					className={
						'rounded-sm px-3 py-2 font-medium font-mono text-[#1A1A1A] text-[11px] uppercase tracking-[0.08em] transition-colors hover:bg-primary hover:text-white'
					}>
					{'API Docs'}
				</Link>
			</div>
			<Link
				href={SMOLD_APP_URI}
				target={'_blank'}
				rel={'noopener noreferrer'}
				className={
					'rounded-sm px-3 py-2 font-medium font-mono text-[#1A1A1A]/60 text-[11px] uppercase tracking-[0.08em] transition-colors hover:bg-primary hover:text-white'
				}>
				{'Smol'}
			</Link>
		</footer>
	);
}
