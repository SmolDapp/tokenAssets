'use client';

import {LogoSourceField, type TLogoSource} from '@components/Builder/LogoSourceField';
import {TemplateGallery} from '@components/Builder/TemplateGallery';
import {cn} from '@components/lib/utils';
import {Button} from '@components/ui/button';
import Check from '@icons/check.svg';
import {writeBuilderHandoff} from '@utils/builderHandoff';
import {copyToClipboard} from '@utils/clipboard';
import {findLogoTemplate, type TLogoTemplateID} from '@utils/logoTemplates';
import {parseSvgFragment, type TSvgFragment} from '@utils/svgCompose';
import {isForbiddenSvg} from '@utils/svgSafety';
import {useRouter} from 'next/navigation';
import type {ReactElement} from 'react';
import {useMemo, useState} from 'react';

const PARSE_MESSAGE = 'That file is not a usable SVG — it needs a valid <svg> root with a viewBox or a size.';

const SECONDARY_BUTTON_CLASSES =
	'w-full border-white/25 bg-transparent text-white uppercase hover:bg-white/10 hover:text-white';

const FIELD_LABEL_CLASSES = 'font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]';

type TParsedSources = {
	base: TSvgFragment | null;
	badges: (TSvgFragment | null)[];
	baseError: string;
	badgeErrors: string[];
};

type TBuildState = {
	svg: string;
	byteLength: number;
	baseError: string;
	// Indexed like the template's badge boxes, so the message lands on the field that caused it.
	badgeErrors: string[];
	svgError: string;
};

const EMPTY_BUILD: TBuildState = {svg: '', byteLength: 0, baseError: '', badgeErrors: [], svgError: ''};

function downloadSvg(svg: string): void {
	const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = 'logo.svg';
	anchor.click();
	URL.revokeObjectURL(url);
}

export function LogoBuilder(): ReactElement {
	const router = useRouter();
	const [templateID, setTemplateID] = useState<TLogoTemplateID>('project');
	const [baseSource, setBaseSource] = useState<TLogoSource | null>(null);
	// Kept across template switches — going from three icons to one and back should not lose picks.
	const [badgeSources, setBadgeSources] = useState<(TLogoSource | null)[]>([]);
	const [hasBackground, setHasBackground] = useState(false);
	const [scale, setScale] = useState(1);

	const template = findLogoTemplate(templateID);
	const badgeCount = template.badgeSlots.length;

	// Parsing is split out from building because the gallery needs the same fragments to render all
	// nine templates. Every source is parsed, not just the slots the current template exposes, so
	// switching to a template with more badges reuses picks already made.
	//
	// The prefixes are what keep the sources' ids and CSS classes apart once they share one document —
	// see the note at the top of svgCompose.ts. Each badge needs its own, or two badges would collide
	// with each other just as readily as with the base.
	const parsed = useMemo((): TParsedSources => {
		let base: TSvgFragment | null = null;
		let baseError = '';
		if (baseSource) {
			const fragment = parseSvgFragment(baseSource.svgText, 'base-');
			if (fragment) {
				// The measurement rides along so a template can shrink the placement to keep the ink clear
				// of its ring — parsing itself stays synchronous and knows nothing about it.
				base = {...fragment, inkRatio: baseSource.inkRatio, edgeColor: baseSource.edgeColor || undefined};
			} else {
				baseError = PARSE_MESSAGE;
			}
		}

		const badges = badgeSources.map((source, index) => {
			if (!source) {
				return null;
			}
			return parseSvgFragment(source.svgText, `badge${index}-`);
		});
		// A null badge means either an empty slot or a source that failed to parse; only the second is
		// an error, which is why this reads both arrays.
		const badgeErrors = badges.map((badge, index) => {
			if (badgeSources[index] && !badge) {
				return PARSE_MESSAGE;
			}
			return '';
		});

		return {base, badges, baseError, badgeErrors};
	}, [baseSource, badgeSources]);

	const build = useMemo((): TBuildState => {
		const {base, badges, baseError, badgeErrors} = parsed;
		if (baseError || badgeErrors.slice(0, badgeCount).some(Boolean)) {
			return {...EMPTY_BUILD, baseError, badgeErrors};
		}
		if (!base) {
			return EMPTY_BUILD;
		}

		const svg = template.build(base, badges, {hasBackground: hasBackground && template.supportsBackground, scale});
		const byteLength = new TextEncoder().encode(svg).length;
		// Size is reported, not enforced: the submit route caps it at 150KB anyway, and a heavy result
		// is still worth copying or downloading.
		let svgError = '';
		if (isForbiddenSvg(svg)) {
			svgError =
				'One of the sources is not a pure vector — no scripts, event handlers, external links or embedded rasters.';
		}
		return {svg, byteLength, baseError: '', badgeErrors, svgError};
	}, [parsed, badgeCount, template, hasBackground, scale]);

	// Two distinct states: anything composed at all is worth previewing (the base shows before its
	// badges are picked, and a rejected result is easier to understand when you can see it), while the
	// actions need a complete, accepted build.
	const hasBuild = build.svg.length > 0;
	const hasEveryBadge = template.badgeSlots.every((_, index) => Boolean(badgeSources[index]));
	// hasBuild already implies a base source: the build returns an empty SVG until one parses.
	const isUsable = hasEveryBadge && hasBuild && !build.svgError;

	function setBadgeSource(index: number, source: TLogoSource | null): void {
		setBadgeSources(current => {
			const next = [...current];
			next[index] = source;
			return next;
		});
	}

	function handleSubmit(): void {
		writeBuilderHandoff({svgText: build.svg, svgFileName: `${template.ID}.svg`});
		router.push('/submit');
	}

	return (
		<div
			className={
				'grid min-w-0 gap-6 rounded-sm border border-white/15 bg-white/[0.04] p-5 md:p-6 lg:grid-cols-2 lg:gap-10'
			}>
			<div className={'min-w-0 space-y-5'}>
				<div className={'space-y-1.5'}>
					<span className={cn('block', FIELD_LABEL_CLASSES)}>{'Template'}</span>
					<TemplateGallery
						value={templateID}
						onChange={setTemplateID}
						base={parsed.base}
						badges={parsed.badges}
						hasBackground={hasBackground}
					/>
					{template.supportsBackground && (
						<button
							type={'button'}
							aria-pressed={hasBackground}
							onClick={() => setHasBackground(value => !value)}
							className={cn(
								'flex w-full items-center gap-2.5 rounded-sm border p-3 text-left transition-colors',
								hasBackground && 'border-white/60 bg-white/10',
								!hasBackground && 'border-white/15 bg-white/5 hover:border-white/30'
							)}>
							<span
								className={cn(
									'flex size-4 shrink-0 items-center justify-center rounded-[2px] border',
									hasBackground && 'border-white bg-white',
									!hasBackground && 'border-white/30'
								)}>
								{hasBackground && <Check className={'size-3 text-primary'} />}
							</span>
							<span className={'flex min-w-0 flex-col'}>
								<span className={'font-mono text-sm text-white uppercase'}>{'White background'}</span>
								<span className={'font-mono text-white/45 text-xxs leading-relaxed'}>
									{'A white disc behind everything, for a transparent or monochrome logo.'}
								</span>
							</span>
						</button>
					)}
				</div>

				<LogoSourceField
					label={template.baseLabel}
					value={baseSource}
					onChange={setBaseSource}
					error={build.baseError}
				/>

				<div className={'space-y-1.5'}>
					<div className={'flex items-baseline justify-between'}>
						<span className={FIELD_LABEL_CLASSES}>{'Logo size'}</span>
						<span className={'font-mono text-white/45 text-xxs'}>{`${Math.round(scale * 100)}%`}</span>
					</div>
					<input
						type={'range'}
						min={50}
						max={100}
						step={5}
						value={Math.round(scale * 100)}
						onChange={event => setScale(Number(event.target.value) / 100)}
						aria-label={'Logo size'}
						className={'w-full cursor-pointer accent-white'}
					/>
					<span className={'block font-mono text-white/35 text-xxs leading-relaxed'}>
						{
							'100% is the largest that still clears the frame. Pull it in for a logo that reads as touching the edge.'
						}
					</span>
				</div>

				{template.badgeSlots.map((slot, index) => (
					<LogoSourceField
						// The slots are positional: index IS the identity, there is nothing else to key on.
						// biome-ignore lint/suspicious/noArrayIndexKey: positional slots, order is the meaning.
						key={index}
						label={slot.label}
						value={badgeSources[index] || null}
						onChange={source => setBadgeSource(index, source)}
						error={build.badgeErrors[index]}
					/>
				))}
			</div>

			<div className={'flex min-w-0 flex-col gap-5'}>
				<div className={'flex flex-col gap-1.5'}>
					<span className={cn('block', FIELD_LABEL_CLASSES)}>{'Result'}</span>
					{/* Fixed height, not flex-1: the grid stretches this cell to the tallest column, so a
					    taller left side (a second source field, an error) would otherwise resize the preview. */}
					<div
						className={cn(
							'flex h-[280px] items-center justify-center rounded-sm bg-white/20',
							'[background-image:radial-gradient(#FFFFFF11_1px,transparent_1px)] [background-size:12px_12px]'
						)}>
						{!hasBuild && (
							<>
								<span className={'sr-only'}>{'Pick a template and its icons'}</span>
								<div
									aria-hidden={'true'}
									className={'size-32 rounded-full bg-white/25'}
								/>
							</>
						)}
						{hasBuild && (
							// biome-ignore lint/performance/noImgElement: local data-URI preview; next/image cannot optimize a data URL.
							<img
								src={`data:image/svg+xml,${encodeURIComponent(build.svg)}`}
								alt={'Composed logo preview'}
								className={'size-32 object-contain'}
							/>
						)}
					</div>
					{hasBuild && (
						<span className={'block font-mono text-white/35 text-xxs'}>
							{`${(build.byteLength / 1024).toFixed(1)} KB`}
						</span>
					)}
				</div>

				{build.svgError && (
					<p
						role={'alert'}
						className={'font-mono text-error text-xs'}>
						{build.svgError}
					</p>
				)}

				{/* `outline` paints text-primary on a transparent background — built for the white drawer,
				    invisible on this dark panel. Overridden to the white-on-dark idiom the other dark
				    forms use. */}
				<div className={'grid grid-cols-2 gap-2 font-mono'}>
					<Button
						className={SECONDARY_BUTTON_CLASSES}
						variant={'outline'}
						disabled={!isUsable}
						onClick={() => copyToClipboard(build.svg, 'SVG copied to clipboard')}>
						{'Copy SVG'}
					</Button>
					<Button
						className={SECONDARY_BUTTON_CLASSES}
						variant={'outline'}
						disabled={!isUsable}
						onClick={() => downloadSvg(build.svg)}>
						{'Download'}
					</Button>
				</div>

				<Button
					type={'button'}
					variant={'primary'}
					size={'lg'}
					disabled={!isUsable}
					onClick={handleSubmit}
					className={'w-full'}>
					{'Submit this logo →'}
				</Button>
			</div>
		</div>
	);
}
