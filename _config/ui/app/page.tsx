import {BrandLogo} from '@components/BrandLogo';
import {LogoWall} from '@components/LogoWall';
import {cn} from '@components/lib/utils';
import {ASSETS_BASE_URI, CHAINS, DEFAULT_CHAIN, GITHUB_URI, SMOLD_APP_URI, TOTAL_TOKENS} from '@utils/constants';
import {getFeaturedTokens} from '@utils/tokens.server';
import Link from 'next/link';
import type {ReactElement} from 'react';
import {preconnect} from 'react-dom';

// Rendered per request so the featured logo wall is re-shuffled on each visit.
export const dynamic = 'force-dynamic';

function BrandMark(): ReactElement {
	return (
		<div className={'flex items-center gap-3'}>
			<BrandLogo />
			<span className={'font-medium font-mono text-sm text-white uppercase tracking-[0.08em]'}>
				{'Token Assets'}
			</span>
		</div>
	);
}

function Stat({value, label}: {value: string; label: string}): ReactElement {
	return (
		<div className={'flex flex-col gap-1'}>
			<span className={'font-medium font-mono text-2xl text-white leading-none md:text-4xl'}>{value}</span>
			<span className={'font-mono text-[11px] text-white/45 uppercase tracking-[0.14em]'}>{label}</span>
		</div>
	);
}

function Hero({logos}: {logos: {chainID: string; address: string}[]}): ReactElement {
	return (
		<div className={'grid flex-1 items-center gap-12 py-10 lg:grid-cols-12 lg:gap-20'}>
			<div className={'flex min-w-0 flex-col gap-7 lg:col-span-6'}>
				<span className={'font-mono text-[11px] text-white/45 uppercase tracking-[0.22em]'}>
					{'Open-source logo CDN'}
				</span>

				<h1
					className={cn(
						'font-medium font-mono text-white uppercase',
						'text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl xl:text-6xl'
					)}>
					{'One CDN for'}
					<br />
					{'every token'}
				</h1>

				<p className={'max-w-md font-mono text-[15px] text-white/70 leading-relaxed'}>
					{
						'Every cryptocurrency token logo, unified under one endpoint. SVG and PNG, addressed by chain ID and contract — free, with no API key.'
					}
				</p>

				<div className={'flex items-end gap-x-5 border-white/10 border-y py-5 md:gap-x-8'}>
					<Stat value={TOTAL_TOKENS.toLocaleString('en-US')} label={'Tokens'} />
					<div className={'h-8 w-px bg-white/15'} />
					<Stat value={String(CHAINS.length)} label={'Chains'} />
					<div className={'h-8 w-px bg-white/15'} />
					<Stat value={'SVG·PNG'} label={'Formats'} />
				</div>

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
					<Link href={GITHUB_URI} target={'_blank'} rel={'noopener noreferrer'}>
						<button
							type={'button'}
							className={cn(
								'flex h-12 items-center gap-2 rounded-sm border border-white/25 px-6',
								'font-medium font-mono text-white text-xs uppercase tracking-[0.08em]',
								'transition-colors hover:bg-white/10'
							)}>
							{'GitHub'}
							<span className={'text-white/60'}>{'↗'}</span>
						</button>
					</Link>
				</div>

				<div className={'rounded-sm border border-white/15 bg-white/[0.04] p-3.5'}>
					<div className={'flex items-center gap-2 pb-1.5'}>
						<span className={'rounded-[3px] bg-white/15 px-1.5 py-px font-mono text-[10px] text-white/80'}>
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

				<Link
					href={`${GITHUB_URI}#contributing`}
					target={'_blank'}
					rel={'noopener noreferrer'}
					className={
						'group -mt-1 inline-flex items-center gap-1.5 font-mono text-[12px] text-white/50 transition-colors hover:text-white'
					}>
					{'Missing a token? Add one on GitHub'}
					<span className={'transition-transform group-hover:translate-x-0.5'}>{'↗'}</span>
				</Link>
			</div>

			<div className={'min-w-0 lg:col-span-6'}>
				<LogoWall logos={logos} />
			</div>
		</div>
	);
}

function Footer(): ReactElement {
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

export default function Home(): ReactElement {
	// Warm the connections the logo CDN redirects through so the wall paints faster.
	preconnect('https://assets.smold.app');
	preconnect('https://raw.githubusercontent.com');
	const logos = getFeaturedTokens(25);
	return (
		<main className={'relative flex min-h-screen w-full flex-col overflow-hidden bg-primary'}>
			<div
				aria-hidden={'true'}
				className={cn(
					'pointer-events-none absolute inset-0',
					'[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]'
				)}
			/>
			<div className={'relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 md:px-10 md:py-10'}>
				<BrandMark />
				<Hero logos={logos} />
			</div>
			<Footer />
		</main>
	);
}
