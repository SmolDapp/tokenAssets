import {cn} from '@components/lib/utils';
import {Input} from '@components/ui/input';
import {useChain} from '@contexts/WithChain';
import {useDrawerOpen} from '@hooks/useDrawerOpen';
import Cross from '@icons/cross.svg';
import SearchIcon from '@icons/search.svg';
import {withSearch} from '@utils/helpers';
import {useRouter, useSearchParams} from 'next/navigation';
import type {ReactElement} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDebounceValue} from 'usehooks-ts';

export function SearchBar({onOpenPalette}: {onOpenPalette: () => void}): ReactElement {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {chain} = useChain();
	const isDrawerOpen = useDrawerOpen();
	const inputRef = useRef<HTMLInputElement>(null);

	const currentSearch = searchParams.get('search') || '';
	const [inputValue, setInputValue] = useState(currentSearch);
	const [debouncedValue] = useDebounceValue(inputValue, 300);

	// Push the debounced query to the URL. Fires only on the user's own input (not on route
	// changes), and reads the live URL, so a search set elsewhere (the command palette, or a
	// cross-chain navigation) is preserved instead of clobbered. Always targets the chain LIST
	// path: pushing the raw pathname from a token detail page would re-match the @drawer
	// interceptor and pop a drawer of the current token instead of searching.
	//
	// Skipped entirely while an intercepted drawer is open: a debounce firing ~300ms after the
	// user clicked a token card would push the bare chain URL on top of the drawer's URL,
	// desyncing the @drawer slot into a drawer that router.back() can never close.
	useEffect(() => {
		if (isDrawerOpen) {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		if ((params.get('search') || '') === debouncedValue) {
			return;
		}
		if (debouncedValue) {
			params.set('search', debouncedValue);
		} else {
			params.delete('search');
		}
		router.push(withSearch(`/${chain.slug}`, params.toString()), {scroll: false});
	}, [debouncedValue, router, chain.slug, isDrawerOpen]);

	// Mirror an externally-set search (e.g. the command palette) into the field, unless the user is typing here.
	useEffect(() => {
		if (document.activeElement !== inputRef.current) {
			setInputValue(currentSearch);
		}
	}, [currentSearch]);

	const handleClearSearch = useCallback((): void => {
		setInputValue('');
	}, []);

	return (
		<div className={'flex flex-1 justify-center max-md:w-full'}>
			<div className={'relative max-md:w-full'}>
				<div className={'absolute top-1/2 left-4 -translate-y-1/2'}>
					<SearchIcon
						className={cn(
							'size-4 transition-colors duration-75',
							!inputValue ? 'text-disabled' : 'text-white'
						)}
					/>
				</div>
				<Input
					ref={inputRef}
					type={'search'}
					value={inputValue}
					placeholder={'SEARCH TOKEN'}
					onChange={e => {
						setInputValue(e.target.value);
					}}
					className={cn(
						'h-10 bg-primary-light text-white ring-offset-disabled placeholder:text-disabled',
						'w-full border-none pr-10 pl-12 font-mono md:w-[330px]',
						'rounded-[2px] text-sm uppercase',
						'focus-within:outline-none focus-within:ring-0 focus-within:ring-transparent focus-within:ring-offset-0',
						'focus:outline-none focus:ring-0 focus:ring-transparent focus:ring-offset-0',
						'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0'
					)}
				/>
				<button
					type={'button'}
					onClick={handleClearSearch}
					aria-label={'Clear search'}
					aria-hidden={!inputValue}
					tabIndex={inputValue ? 0 : -1}
					className={cn(
						'absolute top-1/2 right-3 -translate-y-1/2 text-white md:right-[80px]',
						'transition-opacity',
						inputValue ? 'opacity-100' : 'pointer-events-none opacity-0'
					)}>
					<Cross aria-hidden={'true'} className={'size-4'} />
				</button>
				<button
					type={'button'}
					onClick={onOpenPalette}
					aria-label={'Search all chains'}
					className={
						'absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-1 rounded-[2px] border border-disabled px-2 py-1 font-mono font-semibold text-white text-xs uppercase transition-colors hover:bg-primary-light md:flex'
					}>
					<span>{'ctrl'}</span>
					<span>{'k'}</span>
				</button>
			</div>
		</div>
	);
}
