'use client';

import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import {Spinner} from '@components/Spinner';
import {useGlobalSearch} from '@hooks/useGlobalSearch';
import ArrowDown from '@icons/arrow-down.svg';
import Cross from '@icons/cross.svg';
import Search from '@icons/search.svg';
import Upload from '@icons/upload.svg';
import {tokenLogoURI, truncateAddress} from '@utils/helpers';
import {measureInk} from '@utils/inkRadius';
import type {TSearchEntry} from '@utils/types';
import Image from 'next/image';
import type {KeyboardEventHandler, ReactElement} from 'react';
import {useEffect, useRef, useState} from 'react';

export type TLogoSource = {svgText: string; label: string; inkRatio: number; edgeColor: string | null};

// Ink is measured once here, at ingestion, rather than on every recompose: it needs a canvas and is
// async, while composing stays pure and synchronous. See inkRadius.ts for why it is needed at all.
async function toSource(svgText: string, label: string): Promise<TLogoSource> {
	const ink = await measureInk(svgText);
	return {svgText, label, inkRatio: ink.ratio, edgeColor: ink.edgeColor};
}

const RASTER_MESSAGE = 'That is a raster image — the source must be a vector SVG.';

function isSvgFile(file: File): boolean {
	return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

// The CDN serves logo.svg through a 307 to jsDelivr, so a miss costs two TLS handshakes: measured
// ~350ms for a small logo and 1.4s for a 94KB one. The normal cached fetch comes first so picking
// the same token twice is instant.
//
// The retry covers the case that used to justify bypassing the cache outright: a preview elsewhere
// in the app requests this same URL through an <img> (no-cors), and the opaque entry it leaves
// behind hides the CORS headers from a cors-mode fetch, failing it with a bogus missing-ACAO error.
// `reload` skips that entry and replaces it with a usable one.
async function fetchLogo(url: string): Promise<Response> {
	try {
		const response = await fetch(url);
		if (response.ok) {
			return response;
		}
	} catch {
		// Fall through to the cache-busting retry.
	}
	return fetch(url, {cache: 'reload'});
}

// One icon slot, shaped like the chain selector: a trigger showing the current pick, and a floating
// panel holding its own search. Picking from the CDN covers most cases; the drop zone underneath is
// the escape hatch for a project whose logo is not on the CDN yet. Both produce the same
// {svgText, label} — the builder never learns which was used.
export function LogoSourceField({
	label,
	value,
	onChange,
	error
}: {
	label: string;
	value: TLogoSource | null;
	// Null clears the slot.
	onChange: (source: TLogoSource | null) => void;
	error?: string;
}): ReactElement {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [localError, setLocalError] = useState('');
	const {results, hasError} = useGlobalSearch(query, open);
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Close on outside click.
	useEffect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: MouseEvent): void => {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	}, [open]);

	// Focus the search field and reset navigation each time the panel opens.
	useEffect(() => {
		if (open) {
			setQuery('');
			setActiveIndex(0);
			searchRef.current?.focus();
		}
	}, [open]);

	// Scroll the keyboard-active row into view.
	useEffect(() => {
		if (!open || !listRef.current) {
			return;
		}
		const node = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
		node?.scrollIntoView({block: 'nearest'});
	}, [activeIndex, open]);

	async function selectEntry(entry: TSearchEntry): Promise<void> {
		setOpen(false);
		setIsLoading(true);
		setLocalError('');
		try {
			const response = await fetchLogo(tokenLogoURI(entry.chainID, entry.address, 'logo.svg'));
			if (!response.ok) {
				throw new Error(`Unexpected status ${response.status}`);
			}
			onChange(await toSource(await response.text(), entry.symbol || truncateAddress(entry.address)));
		} catch {
			setLocalError('Could not fetch that logo from the CDN.');
		} finally {
			setIsLoading(false);
		}
	}

	async function acceptFile(file: File | undefined): Promise<void> {
		if (!file) {
			return;
		}
		// `accept` only filters the native picker, not a drop — re-check so a raster is rejected with
		// a real explanation instead of being set as the source and failing much later.
		if (!isSvgFile(file)) {
			setLocalError(RASTER_MESSAGE);
			return;
		}
		setLocalError('');
		try {
			onChange(await toSource(await file.text(), file.name));
		} catch {
			setLocalError('Could not read that file.');
		}
	}

	const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = event => {
		if (event.key === 'Escape') {
			setOpen(false);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			// max(0, …) so an empty filtered list never lands on -1.
			setActiveIndex(index => Math.max(0, Math.min(index + 1, results.length - 1)));
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(index => Math.max(index - 1, 0));
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const entry = results[activeIndex];
			if (entry) {
				selectEntry(entry);
			}
		}
	};

	const shownError = error || localError;
	const trimmed = query.trim();

	// The list shows at most one message, so it is resolved once here instead of three mutually
	// exclusive branches in the markup that each had to re-test the ones before them.
	let listMessage = '';
	let listMessageTone = 'text-white/40';
	if (hasError) {
		listMessage = 'Could not load the token index';
		listMessageTone = 'text-error';
	} else if (trimmed.length === 0) {
		listMessage = 'Type to search every chain';
	} else if (results.length === 0) {
		listMessage = 'No token found';
	}

	return (
		<div className={'space-y-1.5'}>
			<span className={'block font-medium font-mono text-white/50 text-xs uppercase tracking-[0.1em]'}>
				{label}
			</span>

			<div className={'flex items-center gap-2'}>
				<div
					ref={rootRef}
					className={'relative min-w-0 flex-1'}>
					<button
						type={'button'}
						onClick={() => setOpen(current => !current)}
						aria-haspopup={'listbox'}
						aria-expanded={open}
						className={cn(
							'flex h-10 w-full items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3',
							'text-sm text-white transition-colors hover:bg-white/10',
							open && 'bg-white/10'
						)}>
						<span className={'flex min-w-0 items-center gap-2'}>
							{value && (
								// biome-ignore lint/performance/noImgElement: local data-URI preview; next/image cannot optimize a data URL.
								<img
									src={`data:image/svg+xml,${encodeURIComponent(value.svgText)}`}
									alt={''}
									className={'size-4 shrink-0 rounded-full object-contain'}
								/>
							)}
							<span className={cn('truncate font-mono', !value && 'text-white/40')}>
								{value?.label || 'Select a token'}
							</span>
						</span>
						<span className={'ml-auto flex shrink-0 items-center gap-2'}>
							{isLoading && (
								<>
									<span className={'sr-only'}>{'Fetching the logo…'}</span>
									<Spinner className={'size-3.5 border text-white/60'} />
								</>
							)}
							<ArrowDown
								className={cn('size-4 text-white/50 transition-transform', open && 'rotate-180')}
							/>
						</span>
					</button>

					{open && (
						<div
							className={cn(
								'absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-md',
								'border border-white/15 bg-primary-170 shadow-[0_16px_38px_rgba(0,0,0,0.45)]',
								'fade-in-0 slide-in-from-top-1 animate-in'
							)}>
							<div className={'flex items-center gap-2 border-white/10 border-b px-3 py-2.5'}>
								<Search className={'size-4 shrink-0 text-white/40'} />
								<input
									ref={searchRef}
									value={query}
									onChange={event => {
										setQuery(event.target.value);
										setActiveIndex(0);
									}}
									onKeyDown={handleKeyDown}
									placeholder={'Search token…'}
									spellCheck={false}
									className={
										'w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35'
									}
								/>
							</div>

							<div
								ref={listRef}
								role={'listbox'}
								aria-label={`${label} results`}
								className={'max-h-[280px] overflow-auto py-1'}>
								{results.map((entry, index) => (
									<button
										key={`${entry.chainID}-${entry.address}`}
										type={'button'}
										role={'option'}
										aria-selected={index === activeIndex}
										data-index={index}
										onMouseEnter={() => setActiveIndex(index)}
										onClick={() => selectEntry(entry)}
										className={cn(
											'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.07]',
											index === activeIndex && 'bg-white/[0.07]'
										)}>
										<Image
											unoptimized
											loading={'eager'}
											src={tokenLogoURI(entry.chainID, entry.address, 'logo-32.png')}
											alt={''}
											width={20}
											height={20}
											className={'size-5 shrink-0 rounded-full object-contain'}
											onError={event => {
												event.currentTarget.src = '/token-placeholder.svg';
											}}
										/>
										<span className={'shrink-0 font-mono text-sm text-white'}>
											{entry.symbol || truncateAddress(entry.address)}
										</span>
										{entry.name && (
											<span className={'min-w-0 truncate font-mono text-white/40 text-xs'}>
												{entry.name}
											</span>
										)}
										<span className={'ml-auto flex shrink-0 items-center pl-2'}>
											<ChainLogo id={entry.chainID} />
										</span>
									</button>
								))}
								{listMessage && (
									<div className={cn('px-3 py-6 text-center font-mono text-xs', listMessageTone)}>
										{listMessage}
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Doubles as the drop target. Small, so dragging onto it is fiddly — the click-to-browse
				    path is the primary one. */}
				<label
					title={'Upload an SVG'}
					onDragOver={event => event.preventDefault()}
					onDrop={event => {
						event.preventDefault();
						acceptFile(event.dataTransfer.files?.[0]);
					}}
					className={cn(
						'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm',
						'border border-white/15 bg-white/5 text-white/50 transition-colors',
						'hover:bg-white/10 hover:text-white'
					)}>
					<Upload className={'size-4'} />
					<span className={'sr-only'}>{'Upload an SVG'}</span>
					<input
						type={'file'}
						accept={'.svg,image/svg+xml'}
						onChange={event => acceptFile(event.target.files?.[0])}
						className={'sr-only'}
					/>
				</label>

				{/* Held in the layout even with nothing to clear, so picking a token does not shrink the
				    trigger beside it. Clearing empties the slot: a template that still needs it stops
				    building, which is what re-disables the actions. */}
				<button
					type={'button'}
					title={'Clear'}
					disabled={!value}
					onClick={() => {
						setLocalError('');
						onChange(null);
					}}
					className={cn(
						'flex size-10 shrink-0 items-center justify-center rounded-sm',
						'border border-white/15 bg-white/5 text-white/50 transition-colors',
						'hover:bg-white/10 hover:text-white',
						!value && 'invisible'
					)}>
					<Cross className={'size-4'} />
					<span className={'sr-only'}>{'Clear this icon'}</span>
				</button>
			</div>

			{shownError && <p className={'font-mono text-error text-xs'}>{shownError}</p>}
		</div>
	);
}
