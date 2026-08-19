import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import {tokenLogoURI, truncateAddress} from '@utils/helpers';
import type {TAuditFinding, TAuditSeverity, TSearchEntry} from '@utils/types';
import Image from 'next/image';
import Link from 'next/link';
import type {ReactElement} from 'react';

const SEVERITY_CLASSES: Record<TAuditSeverity, string> = {
	high: 'border-error/40 bg-error/10 text-error',
	medium: 'border-white/25 bg-white/10 text-white/80',
	low: 'border-white/15 bg-white/5 text-white/50'
};

// Logos are pulled at 128 and shown at 56: these findings are about artwork, and a token whose logo
// is subtly wrong reads as fine at 20px.
const TILE_SIZE = 56;

// The logos come from the CDN, which mirrors main, while the report was computed from the files in
// whatever checkout ran the script. On a working branch the two can disagree — the page header
// carries the report's timestamp so that is visible rather than silent.
function EntryTile({entry}: {entry: TSearchEntry}): ReactElement {
	return (
		<Link
			href={`/${entry.chainID}/${entry.address}`}
			className={cn(
				'flex w-[104px] shrink-0 flex-col items-center gap-1.5 rounded-sm border p-2 transition-colors',
				'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.07]'
			)}>
			<Image
				unoptimized
				loading={'lazy'}
				src={tokenLogoURI(entry.chainID, entry.address, 'logo-128.png')}
				alt={entry.symbol || entry.address}
				width={TILE_SIZE}
				height={TILE_SIZE}
				className={'size-14 rounded-full bg-white/10 object-contain'}
				onError={event => {
					event.currentTarget.src = '/token-placeholder.svg';
				}}
			/>
			<span className={'w-full truncate text-center font-mono text-white text-xs'}>
				{entry.symbol || truncateAddress(entry.address)}
			</span>
			<span className={'flex items-center gap-1 font-mono text-white/40 text-xxs'}>
				<ChainLogo
					id={entry.chainID}
					className={'size-3 shrink-0 rounded-full object-contain'}
				/>
				{entry.chainID}
			</span>
		</Link>
	);
}

export function FindingCard({finding}: {finding: TAuditFinding}): ReactElement {
	return (
		<article className={'space-y-3 rounded-sm border border-white/10 bg-white/[0.02] p-4'}>
			<div className={'flex flex-wrap items-start gap-x-3 gap-y-1.5'}>
				<span
					className={cn(
						'shrink-0 rounded-[2px] border px-1.5 py-0.5 font-mono text-xxs uppercase tracking-[0.1em]',
						SEVERITY_CLASSES[finding.severity]
					)}>
					{finding.severity}
				</span>
				<h3 className={'min-w-0 flex-1 font-mono text-sm text-white'}>{finding.title}</h3>
				<span className={'shrink-0 font-mono text-white/30 text-xxs'}>{finding.check}</span>
			</div>

			<p className={'font-mono text-white/45 text-xs leading-relaxed'}>{finding.detail}</p>

			{/* Scrolls inside itself: a finding can carry two dozen tokens, and the page must never
			    scroll sideways because of one of them. */}
			<div className={'-mx-1 flex gap-2 overflow-x-auto px-1 pb-1'}>
				{finding.entries.map(entry => (
					<EntryTile
						key={`${entry.chainID}-${entry.address}`}
						entry={entry}
					/>
				))}
			</div>
		</article>
	);
}
