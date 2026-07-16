import {BrandMark} from '@components/BrandMark';
import {cn} from '@components/lib/utils';
import {Stat} from '@components/Stat';
import type {ReactElement, ReactNode} from 'react';
import {Fragment} from 'react';

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
	headerRight?: ReactNode;
	children: ReactNode;
};

// Shared by the home page and the submit page: same dark shell, brand mark, and hero grid
// (tagline/heading/description/stat-row) — only the left column's trailing content, the right
// column, and the optional top-right header slot differ per page.
export function HeroPage({
	tagline,
	heading,
	description,
	stats,
	leftExtra,
	headerRight,
	children
}: THeroPageProps): ReactElement {
	return (
		<main className={'relative flex min-h-screen w-full flex-col overflow-hidden bg-primary'}>
			<div
				aria-hidden={'true'}
				className={dotGridClassName}
			/>
			<header className={'relative z-40 w-full shrink-0 border-b border-white/10'}>
				<div
					className={
						'mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10'
					}>
					<BrandMark />
					{headerRight}
				</div>
			</header>

			<div
				className={
					'relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-8 md:px-10 md:py-10'
				}>
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
		</main>
	);
}
