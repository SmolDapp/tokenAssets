import {BrandMark} from '@components/BrandMark';
import {SiteFooter} from '@components/SiteFooter';
import {Stat} from '@components/Stat';
import {cn} from '@components/lib/utils';
import {Fragment} from 'react';

import type {ReactElement, ReactNode} from 'react';

const dotGridClassName = cn(
	'pointer-events-none absolute inset-0',
	'[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]'
);

const headingClassName = cn(
	'font-medium font-mono text-white uppercase',
	'text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl xl:text-6xl'
);

type THeroPageProps = {
	tagline: string;
	heading: ReactNode;
	description: string;
	stats: {value: string; label: string}[];
	leftExtra?: ReactNode;
	children: ReactNode;
};

// Shared by the home page and the submit page: same dark shell, brand mark, hero
// grid (tagline/heading/description/stat-row), and footer — only the left column's
// trailing content and the right column differ per page.
export function HeroPage({tagline, heading, description, stats, leftExtra, children}: THeroPageProps): ReactElement {
	return (
		<main className={'relative flex min-h-screen w-full flex-col overflow-hidden bg-primary'}>
			<div
				aria-hidden={'true'}
				className={dotGridClassName}
			/>
			<div className={'relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 md:px-10 md:py-10'}>
				<BrandMark />

				<div className={'mt-20 grid flex-1 items-start gap-12 py-10 max-md:mt-10 lg:grid-cols-12 lg:gap-20'}>
					<div className={'flex min-w-0 flex-col gap-7 lg:col-span-6'}>
						<span className={'font-mono text-[11px] text-white/45 uppercase tracking-[0.22em]'}>
							{tagline}
						</span>

						<h1 className={headingClassName}>{heading}</h1>

						<p className={'max-w-md font-mono text-[15px] text-white/70 leading-relaxed'}>{description}</p>

						<div className={'flex items-stretch gap-x-5 border-white/10 border-y py-5 md:gap-x-8'}>
							{stats.map((stat, index) => (
								<Fragment key={stat.label}>
									{index > 0 && <div className={'w-px self-stretch bg-white/15'} />}
									<Stat
										value={stat.value}
										label={stat.label}
									/>
								</Fragment>
							))}
						</div>

						{leftExtra}
					</div>

					{children}
				</div>
			</div>

			<SiteFooter />
		</main>
	);
}
