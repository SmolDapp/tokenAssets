import {cn} from '@components/lib/utils';
import {Input} from '@components/ui/input';
import Cross from '@icons/cross.svg';
import SearchIcon from '@icons/search.svg';
import {useRouter, useSearchParams} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDebounceValue} from 'usehooks-ts';

import type {ReactElement} from 'react';

export function SearchBar({onOpenPalette}: {onOpenPalette: () => void}): ReactElement {
	const router = useRouter();
	const searchParams = useSearchParams();
	const inputRef = useRef<HTMLInputElement>(null);

	const currentSearch = searchParams.get('search') || '';
	const [inputValue, setInputValue] = useState(currentSearch);
	const [debouncedValue] = useDebounceValue(inputValue, 300);

	// Push the debounced query to the URL. Fires only on the user's own input (not on route
	// changes), and reads the live URL, so a search/token set elsewhere (the command palette,
	// or a cross-chain navigation) is preserved instead of clobbered.
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if ((params.get('search') || '') === debouncedValue) {
			return;
		}
		if (debouncedValue) {
			params.set('search', debouncedValue);
		} else {
			params.delete('search');
		}
		router.push(`${window.location.pathname}?${params.toString()}`, {scroll: false});
	}, [debouncedValue, router]);

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
				<div className={'-translate-y-1/2 absolute top-1/2 left-4'}>
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
					className={cn(
						'-translate-y-1/2 absolute top-1/2 right-3 text-white md:right-[80px]',
						'transition-opacity',
						inputValue ? 'opacity-100' : 'opacity-0'
					)}>
					<Cross className={'size-4'} />
				</button>
				<button
					type={'button'}
					onClick={onOpenPalette}
					aria-label={'Search all chains'}
					className={
						'-translate-y-1/2 absolute top-1/2 right-3 hidden items-center gap-1 rounded-[2px] border border-disabled px-2 py-1 font-mono font-semibold text-white text-xs uppercase transition-colors hover:bg-primary-light md:flex'
					}>
					<span>{'ctrl'}</span>
					<span>{'k'}</span>
				</button>
			</div>
		</div>
	);
}
