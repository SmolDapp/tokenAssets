'use client';

import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import ArrowDown from '@icons/arrow-down.svg';
import Check from '@icons/check.svg';
import Search from '@icons/search.svg';
import {CHAINS, OFF_CDN_CHAINS, type TAllChainInfo, type TChainInfo} from '@utils/constants';
import type {KeyboardEventHandler, ReactElement} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

// App-curated "Popular" networks, pinned to the top of the selector. Order is intentional.
const POPULAR_CHAIN_SLUGS = ['ethereum', 'base', 'optimism', 'arbitrum', 'polygon', 'bsc'];

const groupHeaderClassName = 'px-3 pt-2.5 pb-1.5 font-mono text-[10px] text-white/40 uppercase tracking-[0.1em]';

type TChainSelectorProps = {
	value: string;
	onChange: (chainID: string) => void;
	id?: string;
	fullWidth?: boolean;
	// Which edge the menu is anchored to. Use 'end' when the trigger sits flush against the right
	// side of its container (e.g. the header), so the 280px menu opens leftward and stays on screen.
	align?: 'start' | 'end';
	// When provided, a searched-for chain not yet on the CDN appears under "Not on the CDN yet"
	// with an "Add +" badge; selecting it hands the chain ID off to start the add-a-network flow.
	onAddNetwork?: (chainID: string) => void;
};

// A dashed letter tile stands in for a chain we have no logo for yet (the off-CDN group).
function LetterTile({name}: {name: string}): ReactElement {
	return (
		<span
			className={
				'flex size-4 shrink-0 items-center justify-center rounded-full border border-white/30 border-dashed font-mono text-[8px] text-white/60'
			}>
			{name.slice(0, 1).toUpperCase()}
		</span>
	);
}

export function ChainSelector({
	value,
	onChange,
	id,
	fullWidth,
	align = 'start',
	onAddNetwork
}: TChainSelectorProps): ReactElement {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const selectedChain = useMemo(() => CHAINS.find(chain => chain.id === value), [value]);

	// The curated set is pinned first; everything else falls under "All networks" so no chain is
	// listed twice. Both groups are filtered by the same query.
	const {popular, others} = useMemo(() => {
		const popularSet = new Set(POPULAR_CHAIN_SLUGS);
		const byPopular = POPULAR_CHAIN_SLUGS.map(slug => CHAINS.find(chain => chain.slug === slug)).filter(Boolean);
		const rest = CHAINS.filter(chain => !popularSet.has(chain.slug));
		return {popular: byPopular, others: rest};
	}, []);

	const trimmedQuery = query.trim().toLowerCase();
	const matches = (chain: TChainInfo): boolean => {
		if (!trimmedQuery) {
			return true;
		}
		return chain.name.toLowerCase().includes(trimmedQuery) || chain.slug.includes(trimmedQuery);
	};
	const popularMatches = popular.filter(matches);
	const otherMatches = others.filter(matches);
	// Off-CDN chains are surfaced only while searching (there are hundreds — showing them all by
	// default would bury the CDN chains) and only when the add-a-network flow is wired up.
	const offCDNMatches =
		onAddNetwork && trimmedQuery
			? OFF_CDN_CHAINS.filter(
					chain => chain.name.toLowerCase().includes(trimmedQuery) || chain.id.includes(trimmedQuery)
				)
			: [];
	// Flattened in render order (Popular → All networks → Not on the CDN) so keyboard navigation
	// walks every visible row; each entry keeps its kind so Enter dispatches to the right handler.
	const flat = [
		...popularMatches.map(chain => ({kind: 'cdn' as const, id: chain.id})),
		...otherMatches.map(chain => ({kind: 'cdn' as const, id: chain.id})),
		...offCDNMatches.map(chain => ({kind: 'off' as const, id: chain.id}))
	];

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

	// Focus the search field and reset navigation each time the menu opens.
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

	// A CDN chain is selected; an off-CDN chain kicks off the add-a-network flow instead.
	function commit(item: {kind: 'cdn' | 'off'; id: string}): void {
		if (item.kind === 'off') {
			onAddNetwork?.(item.id);
		} else {
			onChange(item.id);
		}
		setOpen(false);
	}

	const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = event => {
		if (event.key === 'Escape') {
			setOpen(false);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex(index => Math.min(index + 1, flat.length - 1));
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(index => Math.max(index - 1, 0));
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const item = flat[activeIndex];
			if (item) {
				commit(item);
			}
		}
	};

	function renderItem(chain: TChainInfo, flatIndex: number): ReactElement {
		const isSelected = chain.id === value;
		return (
			<button
				key={chain.id}
				type={'button'}
				role={'option'}
				aria-selected={isSelected}
				data-index={flatIndex}
				onMouseEnter={() => setActiveIndex(flatIndex)}
				onClick={() => commit({kind: 'cdn', id: chain.id})}
				className={cn(
					'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.07]',
					flatIndex === activeIndex && 'bg-white/[0.07]'
				)}>
				<ChainLogo id={chain.id} />
				<span className={'min-w-0 truncate font-mono text-sm text-white'}>{chain.name}</span>
				{isSelected && <Check className={'ml-auto size-4 shrink-0 text-white'} />}
			</button>
		);
	}

	function renderOffItem(chain: TAllChainInfo, flatIndex: number): ReactElement {
		return (
			<button
				key={chain.id}
				type={'button'}
				role={'option'}
				data-index={flatIndex}
				onMouseEnter={() => setActiveIndex(flatIndex)}
				onClick={() => commit({kind: 'off', id: chain.id})}
				className={cn(
					'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.07]',
					flatIndex === activeIndex && 'bg-white/[0.07]'
				)}>
				<LetterTile name={chain.name} />
				<span className={'min-w-0 truncate font-mono text-sm text-white'}>{chain.name}</span>
				<span
					className={
						'ml-auto shrink-0 rounded-[2px] bg-[#D9E8DE] px-1.5 py-0.5 font-mono text-[9px] text-primary'
					}>
					{'Add +'}
				</span>
			</button>
		);
	}

	return (
		<div ref={rootRef} className={cn('relative', fullWidth && 'w-full', !fullWidth && 'inline-block')}>
			<button
				type={'button'}
				id={id}
				onClick={() => setOpen(current => !current)}
				aria-haspopup={'listbox'}
				aria-expanded={open}
				className={cn(
					'flex h-10 items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3',
					'text-sm text-white transition-colors hover:bg-white/10',
					open && 'bg-white/10',
					fullWidth && 'w-full'
				)}>
				<span className={'flex min-w-0 items-center gap-2'}>
					<ChainLogo id={value} />
					<span className={'truncate font-mono'}>{selectedChain?.name || 'Select network'}</span>
				</span>
				<ArrowDown
					className={cn('ml-auto size-4 shrink-0 text-white/50 transition-transform', open && 'rotate-180')}
				/>
			</button>

			{open && (
				<div
					role={'listbox'}
					className={cn(
						'absolute top-[calc(100%+6px)] z-50 overflow-hidden rounded-md',
						'border border-white/15 bg-primary-170 shadow-[0_16px_38px_rgba(0,0,0,0.45)]',
						'fade-in-0 slide-in-from-top-1 animate-in',
						align === 'end' && 'right-0',
						align !== 'end' && 'left-0',
						fullWidth && 'w-full',
						!fullWidth && 'w-[280px]'
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
							placeholder={'Search network…'}
							spellCheck={false}
							className={
								'w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/35'
							}
						/>
					</div>

					<div ref={listRef} className={'max-h-[280px] overflow-auto py-1'}>
						{popularMatches.length > 0 && (
							<>
								<div className={groupHeaderClassName}>{'Popular'}</div>
								{popularMatches.map((chain, index) => renderItem(chain, index))}
							</>
						)}
						{otherMatches.length > 0 && (
							<>
								<div className={groupHeaderClassName}>{'All networks'}</div>
								{otherMatches.map((chain, index) => renderItem(chain, popularMatches.length + index))}
							</>
						)}
						{offCDNMatches.length > 0 && (
							<>
								<div className={groupHeaderClassName}>{'Not on the CDN yet'}</div>
								{offCDNMatches.map((chain, index) =>
									renderOffItem(chain, popularMatches.length + otherMatches.length + index)
								)}
							</>
						)}
						{flat.length === 0 && (
							<div className={'px-3 py-6 text-center font-mono text-white/40 text-xs'}>
								{'No network found'}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
