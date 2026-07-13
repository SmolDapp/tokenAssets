'use client';

import {cn} from '@components/lib/utils';
import {SubmitResult} from '@components/Submit/SubmitResult';
import {Button} from '@components/ui/button';
import ArrowDown from '@icons/arrow-down.svg';
import type {TAllChainInfo} from '@utils/constants';
import Link from 'next/link';
import {signIn} from 'next-auth/react';
import type {ReactElement} from 'react';
import {useEffect, useMemo, useState} from 'react';

const STASH_KEY = 'network-submit-stash';
const labelClassName = 'block font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]';
const metaPillClassName =
	'rounded-[2px] border border-white/15 px-1.5 py-1 font-mono text-[10px] text-white/60 uppercase tracking-[0.06em]';

function isSvgFile(file: File): boolean {
	return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

// A dashed dropzone for one SVG logo: drop or click to browse, with a live preview once filled.
function LogoWell({
	label,
	emptyLabel,
	svgText,
	svgFileName,
	onPick
}: {
	label: string;
	emptyLabel: string;
	svgText: string;
	svgFileName: string;
	onPick: (file: File | undefined) => void;
}): ReactElement {
	const dataURL = useMemo(() => {
		if (!svgText) {
			return null;
		}
		return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
	}, [svgText]);

	return (
		<div className={'space-y-1.5'}>
			<span className={labelClassName}>{label}</span>
			<label
				onDragOver={event => event.preventDefault()}
				onDrop={event => {
					event.preventDefault();
					onPick(event.dataTransfer.files?.[0]);
				}}
				className={cn(
					'flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm',
					'border border-white/20 border-dashed bg-white/5 transition-colors hover:border-white/40'
				)}>
				{dataURL ? (
					// biome-ignore lint/performance/noImgElement: local data-URI preview; next/image can't optimize a data URL.
					<img
						src={dataURL}
						alt={`${svgFileName} preview`}
						className={'size-12 shrink-0 rounded-full bg-white object-contain p-0.5'}
					/>
				) : (
					<span className={'font-mono text-2xl text-white/35'}>{'+'}</span>
				)}
				<span className={'font-mono text-white text-xs'}>{svgFileName || emptyLabel}</span>
				<span className={'font-mono text-[10px] text-white/40 uppercase tracking-[0.1em]'}>
					{dataURL ? 'Click to replace' : 'SVG only'}
				</span>
				<input
					type={'file'}
					accept={'.svg,image/svg+xml'}
					onChange={event => onPick(event.target.files?.[0])}
					className={'sr-only'}
				/>
			</label>
		</div>
	);
}

export function NetworkSubmitForm({chain, signedIn}: {chain: TAllChainInfo; signedIn: boolean}): ReactElement {
	const [chainSvg, setChainSvg] = useState('');
	const [chainSvgName, setChainSvgName] = useState('');
	const [nativeSvg, setNativeSvg] = useState('');
	const [nativeSvgName, setNativeSvgName] = useState('');
	const [svgError, setSvgError] = useState('');
	const [submitError, setSubmitError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [prURL, setPrURL] = useState<string | null>(null);

	// Restore the two logos after returning from the GitHub sign-in redirect (stashed before signIn).
	useEffect(() => {
		const raw = sessionStorage.getItem(STASH_KEY);
		if (!raw) {
			return;
		}
		sessionStorage.removeItem(STASH_KEY);
		try {
			const stash = JSON.parse(raw) as Record<string, string>;
			if (stash.chainID !== chain.id) {
				return;
			}
			setChainSvg(stash.chainSvg || '');
			setChainSvgName(stash.chainSvgName || '');
			setNativeSvg(stash.nativeSvg || '');
			setNativeSvgName(stash.nativeSvgName || '');
		} catch {
			// ignore a corrupt stash
		}
	}, [chain.id]);

	async function readSvg(file: File | undefined, target: 'chain' | 'native'): Promise<void> {
		if (!file) {
			return;
		}
		if (!isSvgFile(file)) {
			setSvgError('That is not an SVG — the logo must be a vector .svg file.');
			return;
		}
		const text = await file.text();
		setSvgError('');
		if (target === 'chain') {
			setChainSvg(text);
			setChainSvgName(file.name);
			return;
		}
		setNativeSvg(text);
		setNativeSvgName(file.name);
	}

	function stashForm(): void {
		sessionStorage.setItem(
			STASH_KEY,
			JSON.stringify({chainID: chain.id, chainSvg, chainSvgName, nativeSvg, nativeSvgName})
		);
	}

	async function handleSubmit(): Promise<void> {
		if (!chainSvg || !nativeSvg) {
			return;
		}
		if (!signedIn) {
			stashForm();
			void signIn('github', {callbackUrl: `/submit/network/${chain.id}`});
			return;
		}
		setIsSubmitting(true);
		setSubmitError('');
		try {
			const response = await fetch('/api/submit/network', {
				method: 'POST',
				headers: {'content-type': 'application/json'},
				body: JSON.stringify({chainID: chain.id, chainSvg, nativeSvg})
			});
			const data = (await response.json()) as {error?: string; prUrl?: string};
			if (!response.ok) {
				setSubmitError(data.error || 'Submission failed — please try again.');
				return;
			}
			setPrURL(data.prUrl || null);
		} catch {
			setSubmitError('Network error — please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	// The button is the single status surface: it names the next missing piece, then the action.
	let submitContent = 'Open pull request →';
	if (!chainSvg) {
		submitContent = 'Add the chain logo';
	} else if (!nativeSvg) {
		submitContent = `Add the ${chain.nativeSymbol} logo`;
	} else if (!signedIn) {
		submitContent = 'Sign in with GitHub →';
	}
	const canSubmit = Boolean(chainSvg) && Boolean(nativeSvg);

	return (
		<>
			<div
				className={
					'min-w-0 space-y-5 rounded-sm border border-white/15 bg-white/[0.04] p-5 md:p-6 lg:col-span-6'
				}>
				<Link
					href={'/submit'}
					className={
						'inline-flex items-center gap-2 font-mono text-white/45 text-xs uppercase tracking-[0.1em] transition-colors hover:text-white/70'
					}>
					<ArrowDown className={'size-4 rotate-90'} />
					{'Back to the network picker'}
				</Link>

				<div className={'flex items-center gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-4'}>
					<span
						className={
							'flex size-12 shrink-0 items-center justify-center rounded-full bg-white font-mono text-lg text-primary'
						}>
						{chain.name.slice(0, 1).toUpperCase()}
					</span>
					<div className={'min-w-0'}>
						<p className={'truncate font-semibold text-white text-xl'}>{chain.name}</p>
						<div className={'mt-1.5 flex flex-wrap gap-1.5'}>
							<span className={metaPillClassName}>{chain.nativeSymbol}</span>
							<span className={metaPillClassName}>{`${chain.nativeDecimals} decimals`}</span>
							<span className={metaPillClassName}>{`ID ${chain.id}`}</span>
						</div>
					</div>
				</div>

				<div className={'grid grid-cols-3 divide-x divide-white/10 rounded-sm border border-white/10'}>
					{[
						{label: 'Chain ID', value: chain.id},
						{label: 'Native token', value: chain.nativeSymbol},
						{label: 'Decimals', value: String(chain.nativeDecimals)}
					].map(detail => (
						<div key={detail.label} className={'min-w-0 px-3 py-2.5'}>
							<span className={'block font-mono text-[10px] text-white/40 uppercase tracking-[0.1em]'}>
								{detail.label}
							</span>
							<span className={'block truncate font-mono text-sm text-white'}>{detail.value}</span>
						</div>
					))}
				</div>

				<div className={'grid gap-3 sm:grid-cols-2'}>
					<LogoWell
						label={'Chain logo'}
						emptyLabel={'Drop or click to browse'}
						svgText={chainSvg}
						svgFileName={chainSvgName}
						onPick={file => readSvg(file, 'chain')}
					/>
					<LogoWell
						label={`Native token — ${chain.nativeSymbol}`}
						emptyLabel={`Add the ${chain.nativeSymbol} logo`}
						svgText={nativeSvg}
						svgFileName={nativeSvgName}
						onPick={file => readSvg(file, 'native')}
					/>
				</div>

				{svgError && <p className={'font-mono text-error text-xs'}>{svgError}</p>}
				{submitError && (
					<p role={'alert'} className={'font-mono text-error text-xs'}>
						{submitError}
					</p>
				)}

				<Button
					type={'button'}
					variant={'primary'}
					size={'lg'}
					disabled={!canSubmit || isSubmitting}
					onClick={handleSubmit}
					className={'w-full'}>
					{isSubmitting ? (
						<span
							className={'size-4 animate-spin rounded-full border-2 border-primary border-t-transparent'}>
							<span className={'sr-only'}>{'Submitting…'}</span>
						</span>
					) : (
						submitContent
					)}
				</Button>
			</div>

			<SubmitResult prURL={prURL} onClose={() => setPrURL(null)} />
		</>
	);
}
