'use client';

import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import {useChain} from '@contexts/WithChain';
import {useGlobalSearch} from '@hooks/useGlobalSearch';
import SearchIcon from '@icons/search.svg';
import * as Dialog from '@radix-ui/react-dialog';
import {CHAINS} from '@utils/constants';
import {tokenLogoURI, tokenPageURI, truncateAddress, withSearch} from '@utils/helpers';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';

import type {TSearchEntry} from '@utils/types';
import type {ReactElement, KeyboardEvent as ReactKeyboardEvent} from 'react';

const CHAIN_BY_ID = new Map(CHAINS.map(chain => [chain.id, chain]));

type TCommandPaletteProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function ResultRow({
	entry,
	isActive,
	onSelect,
	onHover
}: {
	entry: TSearchEntry;
	isActive: boolean;
	onSelect: () => void;
	onHover: () => void;
}): ReactElement {
	const ref = useRef<HTMLButtonElement>(null);
	const label = entry.symbol || truncateAddress(entry.address);

	useEffect(() => {
		if (isActive) {
			ref.current?.scrollIntoView({block: 'nearest'});
		}
	}, [isActive]);

	return (
		<button
			ref={ref}
			type={'button'}
			onClick={onSelect}
			onMouseEnter={onHover}
			className={cn(
				'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
				isActive && 'bg-secondary'
			)}>
			<Image
				unoptimized
				loading={'eager'}
				src={tokenLogoURI(entry.chainID, entry.address, 'logo-32.png')}
				alt={''}
				width={32}
				height={32}
				className={'size-8 shrink-0 rounded-full object-contain'}
				onError={event => {
					event.currentTarget.src = '/token-placeholder.svg';
				}}
			/>
			<span className={'flex min-w-0 flex-col'}>
				<span className={'truncate font-mono text-black text-sm'}>{label}</span>
				<span className={'flex min-w-0 items-center gap-2 font-mono text-xs'}>
					{entry.name && <span className={'min-w-0 truncate text-subtle'}>{entry.name}</span>}
					<span className={'shrink-0 text-black/60'}>{truncateAddress(entry.address, 4)}</span>
				</span>
			</span>
			<span className={'ml-auto flex shrink-0 items-center pl-2'}>
				<ChainLogo id={entry.chainID} />
			</span>
		</button>
	);
}

export function CommandPalette({open, onOpenChange}: TCommandPaletteProps): ReactElement {
	const router = useRouter();
	const {chain: currentChain} = useChain();
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const {results} = useGlobalSearch(query, open);

	useEffect(() => {
		const onWindowKeyDown = (event: KeyboardEvent): void => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				onOpenChange(true);
			}
		};
		window.addEventListener('keydown', onWindowKeyDown);
		return () => window.removeEventListener('keydown', onWindowKeyDown);
	}, [onOpenChange]);

	useEffect(() => {
		if (!open) {
			setQuery('');
			setActiveIndex(0);
		}
	}, [open]);

	const goToEntry = useCallback(
		(entry: TSearchEntry): void => {
			const chain = CHAIN_BY_ID.get(entry.chainID);
			if (!chain) {
				return;
			}
			onOpenChange(false);
			const params = new URLSearchParams();
			const search = query.trim();
			if (search) {
				params.set('search', search);
			}
			const href = withSearch(tokenPageURI(chain.slug, entry.address), params.toString());
			// A same-chain pick is intercepted into the drawer; a cross-chain pick changes the
			// [chain] segment, which the interceptor can't handle, so hard-navigate to the full page.
			if (chain.id === currentChain.id) {
				router.push(href, {scroll: false});
			} else {
				window.location.assign(href);
			}
		},
		[router, onOpenChange, query, currentChain.id]
	);

	const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex(index => Math.min(index + 1, results.length - 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(index => Math.max(index - 1, 0));
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const entry = results[activeIndex];
			if (entry) {
				goToEntry(entry);
			}
		}
	};

	const trimmed = query.trim();
	const showEmpty = trimmed.length > 0 && results.length === 0;

	return (
		<Dialog.Root
			open={open}
			onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className={'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]'} />
				<Dialog.Content
					className={cn(
						'-translate-x-1/2 fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl',
						'overflow-hidden rounded-lg border border-subtle bg-white shadow-2xl'
					)}>
					<Dialog.Title className={'sr-only'}>{'Search tokens'}</Dialog.Title>
					<Dialog.Description className={'sr-only'}>
						{'Search token logos across every chain, or paste a contract address.'}
					</Dialog.Description>

					<div className={'flex items-center gap-3 border-separator border-b px-4'}>
						<SearchIcon className={'size-4 shrink-0 text-subtle'} />
						<input
							value={query}
							onChange={event => {
								setQuery(event.target.value);
								setActiveIndex(0);
							}}
							onKeyDown={handleInputKeyDown}
							placeholder={'Search all chains or paste an address'}
							className={
								'h-14 w-full bg-transparent font-mono text-black text-sm outline-none placeholder:text-subtle'
							}
						/>
					</div>

					<div className={'scrollbar-none max-h-[56vh] overflow-y-auto'}>
						{results.map((entry, index) => (
							<ResultRow
								key={`${entry.chainID}-${entry.address}`}
								entry={entry}
								isActive={index === activeIndex}
								onSelect={() => goToEntry(entry)}
								onHover={() => setActiveIndex(index)}
							/>
						))}
						{showEmpty && (
							<p className={'px-4 py-8 text-center font-mono text-sm text-subtle'}>
								{`No token matches "${trimmed}"`}
							</p>
						)}
					</div>

					{results.length > 0 && (
						<div
							className={
								'flex items-center gap-4 border-separator border-t px-4 py-2 font-mono text-[10px] text-subtle uppercase tracking-wide'
							}>
							<span>{'↑↓ Navigate'}</span>
							<span>{'↵ Open'}</span>
							<span>{'Esc Close'}</span>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
