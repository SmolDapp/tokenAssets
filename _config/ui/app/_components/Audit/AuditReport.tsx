'use client';

import {FindingCard} from '@components/Audit/FindingCard';
import {cn} from '@components/lib/utils';
import {Button} from '@components/ui/button';
import {Spinner} from '@components/Spinner';
import type {TAuditFamily, TAuditReport} from '@utils/types';
import type {ReactElement} from 'react';
import {useEffect, useMemo, useState} from 'react';

const FAMILY_LABELS: {family: TAuditFamily; label: string}[] = [
	{family: 'shared-logo', label: 'Same logo, different token'},
	{family: 'divergent-logo', label: 'Same token, different logo'},
	{family: 'image-integrity', label: 'Image integrity'},
	{family: 'metadata', label: 'Metadata'}
];

// Findings are rendered a page at a time. The full report runs to several hundred entries, each
// carrying up to two dozen logos, so rendering it in one go would mean thousands of image requests
// for a list nobody reads past the top of.
const PAGE_SIZE = 25;

const TAB_CLASSES = 'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors';

function formatTimestamp(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	return parsed.toISOString().replace('T', ' ').slice(0, 16);
}

export function AuditReport(): ReactElement {
	const [report, setReport] = useState<TAuditReport | null>(null);
	const [loadError, setLoadError] = useState('');
	const [family, setFamily] = useState<TAuditFamily | 'all'>('shared-logo');
	const [shown, setShown] = useState(PAGE_SIZE);

	useEffect(() => {
		let cancelled = false;
		fetch('/data/audit.json')
			.then(async response => {
				if (!response.ok) {
					throw new Error(`Unexpected status ${response.status}`);
				}
				return (await response.json()) as TAuditReport;
			})
			.then(loaded => {
				if (!cancelled) {
					setReport(loaded);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLoadError('No audit report found. Run `npm run audit` to generate one.');
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const visible = useMemo(() => {
		if (!report) {
			return [];
		}
		if (family === 'all') {
			return report.findings;
		}
		return report.findings.filter(finding => finding.family === family);
	}, [report, family]);

	function selectFamily(next: TAuditFamily | 'all'): void {
		setFamily(next);
		setShown(PAGE_SIZE);
	}

	if (loadError) {
		return (
			<p
				role={'alert'}
				className={'font-mono text-error text-sm'}>
				{loadError}
			</p>
		);
	}

	if (!report) {
		return (
			<div className={'flex items-center gap-2 font-mono text-sm text-white/50'}>
				<Spinner className={'size-4 border text-white/60'} />
				{'Loading the report…'}
			</div>
		);
	}

	return (
		<div className={'space-y-5'}>
			<div className={'flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-white/45 text-xs'}>
				<span>{`${report.findings.length} findings across ${report.tokenCount} tokens`}</span>
				<span>{`generated ${formatTimestamp(report.generatedAt)} UTC`}</span>
				{report.skippedPixels && (
					<span className={'text-white/70'}>{'image pass skipped — run without --skip-pixels'}</span>
				)}
			</div>

			<div className={'flex flex-wrap gap-2'}>
				{FAMILY_LABELS.map(entry => {
					const count = report.totals.byFamily[entry.family] || 0;
					const isSelected = family === entry.family;
					return (
						<button
							key={entry.family}
							type={'button'}
							aria-pressed={isSelected}
							onClick={() => selectFamily(entry.family)}
							className={cn(
								TAB_CLASSES,
								isSelected && 'border-white/60 bg-white/10 text-white',
								!isSelected && 'border-white/15 bg-white/5 text-white/60 hover:border-white/40'
							)}>
							{`${entry.label} (${count})`}
						</button>
					);
				})}
				<button
					type={'button'}
					aria-pressed={family === 'all'}
					onClick={() => selectFamily('all')}
					className={cn(
						TAB_CLASSES,
						family === 'all' && 'border-white/60 bg-white/10 text-white',
						family !== 'all' && 'border-white/15 bg-white/5 text-white/60 hover:border-white/40'
					)}>
					{`Everything (${report.findings.length})`}
				</button>
			</div>

			{visible.length === 0 && (
				<p className={'font-mono text-sm text-white/40'}>{'Nothing found in this family.'}</p>
			)}

			<div className={'space-y-3'}>
				{visible.slice(0, shown).map(finding => (
					<FindingCard
						key={`${finding.check}-${finding.entries[0]?.chainID}-${finding.entries[0]?.address}-${finding.title}`}
						finding={finding}
					/>
				))}
			</div>

			{shown < visible.length && (
				<Button
					variant={'outline'}
					onClick={() => setShown(current => current + PAGE_SIZE)}
					className={
						'w-full border-white/25 bg-transparent text-white uppercase hover:bg-white/10 hover:text-white'
					}>
					{`Show more (${visible.length - shown} left)`}
				</Button>
			)}
		</div>
	);
}
