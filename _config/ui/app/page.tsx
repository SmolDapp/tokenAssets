import {HeroPage} from '@components/HeroPage';
import {LogoWall} from '@components/LogoWall';
import {cn} from '@components/lib/utils';
import {ASSETS_BASE_URI, CHAINS, DEFAULT_CHAIN, TOTAL_TOKENS} from '@utils/constants';
import {getFeaturedTokens} from '@utils/tokens.server';
import Link from 'next/link';
import type {ReactElement} from 'react';
import {preconnect} from 'react-dom';

// Rendered per request so the featured logo wall is re-shuffled on each visit.
export const dynamic = 'force-dynamic';

export default function Home(): ReactElement {
	// Warm the connections the logo CDN redirects through so the wall paints faster.
	preconnect('https://assets.smold.app');
	preconnect('https://raw.githubusercontent.com');
	const logos = getFeaturedTokens(25);

	return (
		<HeroPage
			tagline={'Open-source logo CDN'}
			heading={
				<>
					{'One CDN for'}
					<br />
					{'every token'}
				</>
			}
			description={
				'Every cryptocurrency token logo, unified under one endpoint. SVG and PNG, addressed by chain ID and contract — free, with no API key.'
			}
			stats={[
				{value: TOTAL_TOKENS.toLocaleString('en-US'), label: 'Tokens'},
				{value: String(CHAINS.length), label: 'Chains'},
				{value: 'SVG·PNG', label: 'Formats'}
			]}
			leftExtra={
				<>
					<div className={'flex flex-wrap items-center gap-3'}>
						<Link href={`/${DEFAULT_CHAIN.slug}`}>
							<button
								type={'button'}
								className={cn(
									'group flex h-12 items-center gap-2 rounded-sm px-6',
									'bg-white font-medium font-mono text-primary text-xs uppercase tracking-[0.08em]',
									'transition-colors hover:bg-secondary'
								)}>
								{'Explore tokens'}
								<span className={'transition-transform group-hover:translate-x-1'}>{'→'}</span>
							</button>
						</Link>
						<Link href={'/submit'}>
							<button
								type={'button'}
								className={cn(
									'group flex h-12 items-center gap-2 rounded-sm border border-white/25 px-6',
									'font-medium font-mono text-white text-xs uppercase tracking-[0.08em]',
									'transition-colors hover:bg-white/10'
								)}>
								{'Missing a token? Submit it'}
								<span className={'transition-transform group-hover:translate-x-1'}>{'→'}</span>
							</button>
						</Link>
					</div>

					<div className={'rounded-sm border border-white/15 bg-white/[0.04] p-3.5'}>
						<div className={'flex items-center gap-2 pb-1.5'}>
							<span
								className={
									'rounded-[3px] bg-white/15 px-1.5 py-px font-mono text-[10px] text-white/80'
								}>
								{'GET'}
							</span>
							<span className={'font-mono text-[10px] text-white/40 uppercase tracking-[0.14em]'}>
								{'Endpoint'}
							</span>
						</div>
						<p
							className={
								'scrollbar-none overflow-x-auto whitespace-nowrap font-mono text-[12px] text-white/80'
							}>
							{`${ASSETS_BASE_URI.replace('https://', '')}/token/[chain]/[token]/logo-128.png`}
						</p>
					</div>
				</>
			}>
			<div className={'min-w-0 md:mt-10 lg:col-span-6'}>
				<LogoWall logos={logos} />
			</div>
		</HeroPage>
	);
}
