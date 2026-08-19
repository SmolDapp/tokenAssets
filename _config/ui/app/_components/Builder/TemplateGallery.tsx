'use client';

import {cn} from '@components/lib/utils';
import {LOGO_TEMPLATES, type TBuildOptions, type TLogoTemplateID} from '@utils/logoTemplates';
import type {TSvgFragment} from '@utils/svgCompose';
import type {ReactElement} from 'react';
import {useMemo} from 'react';

const SQUARE = {minX: 0, minY: 0, width: 32, height: 32};

// Stands in until a base token is picked, so every convention still shows its own frame instead of
// an empty cell. A flat disc reads as "a token goes here" without pretending to be a real one.
const PLACEHOLDER_BASE: TSvgFragment = {
	content: '<g><circle cx="16" cy="16" r="16" fill="#8FB49D"/></g>',
	viewBox: SQUARE,
	inkRatio: 1,
	edgeColor: '#8FB49D'
};

// Fills a badge slot that has no icon yet. Lighter than the base and rimmed in the page ground, so it
// reads as a separate object sitting ON the base — which is the entire difference between the four
// badge conventions. Without it they all render as the bare base and look identical.
const PLACEHOLDER_BADGE: TSvgFragment = {
	content: '<g><circle cx="16" cy="16" r="16" fill="#123524"/><circle cx="16" cy="16" r="13" fill="#D9E8DE"/></g>',
	viewBox: SQUARE,
	inkRatio: 1
};

// Each cell is the template's real output, built through the same pipeline as the result, so picking
// a convention is a comparison rather than a reading task, and a badge that has gone illegible shows
// up here rather than after a PR.
export function TemplateGallery({
	value,
	onChange,
	base,
	badges,
	hasBackground
}: {
	value: TLogoTemplateID;
	onChange: (id: TLogoTemplateID) => void;
	base: TSvgFragment | null;
	badges: (TSvgFragment | null)[];
	hasBackground: boolean;
}): ReactElement {
	// Deliberately built at scale 1: these answer "which convention", and re-encoding nine data URIs
	// on every drag of the size slider would flicker for no information gained.
	const previews = useMemo(() => {
		const source = base || PLACEHOLDER_BASE;
		return LOGO_TEMPLATES.map(template => {
			// Every slot the template declares gets filled, standing in for whatever is still unpicked.
			// Only the gallery does this — the real build leaves empty slots empty, so nothing invented
			// here can reach the submitted logo.
			const slots = template.badgeSlots.map((_, index) => badges[index] || PLACEHOLDER_BADGE);
			// Gated on supportsBackground exactly as the real build gates it. Without the gate, a
			// template that paints its own backing shows a white disc here that the result never has.
			const options: TBuildOptions = {hasBackground: hasBackground && template.supportsBackground, scale: 1};
			return {
				ID: template.ID,
				label: template.label,
				uri: `data:image/svg+xml,${encodeURIComponent(template.build(source, slots, options))}`
			};
		});
	}, [base, badges, hasBackground]);

	const selected = LOGO_TEMPLATES.find(template => template.ID === value);

	return (
		<div className={'space-y-2'}>
			{/* Real radios sharing a name rather than buttons: the arrow-key navigation a one-of-many
			    picker is expected to have then comes from the browser instead of being reimplemented. */}
			<div className={'flex flex-wrap gap-2'}>
				{previews.map(preview => {
					const isSelected = preview.ID === value;
					return (
						<label
							key={preview.ID}
							title={preview.label}
							className={cn(
								'flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-colors',
								'has-[:focus-visible]:border-white has-[:focus-visible]:bg-white/10',
								isSelected && 'border-white/60 bg-white/10',
								!isSelected && 'border-white/15 bg-white/5 hover:border-white/40'
							)}>
							<input
								type={'radio'}
								name={'logo-template'}
								value={preview.ID}
								checked={isSelected}
								onChange={() => onChange(preview.ID)}
								className={'sr-only'}
							/>
							{/* biome-ignore lint/performance/noImgElement: local data-URI preview; next/image cannot optimize a data URL. */}
							<img
								src={preview.uri}
								alt={preview.label}
								className={'size-9 object-contain'}
							/>
						</label>
					);
				})}
			</div>
			<span
				aria-live={'polite'}
				className={'block font-mono text-white/45 text-xxs uppercase tracking-[0.1em]'}>
				{selected?.label}
			</span>
		</div>
	);
}
