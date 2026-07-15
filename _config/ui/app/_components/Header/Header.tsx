'use client';

import {CommandPalette} from '@components/CommandPalette';
import {MenuButtons} from '@components/Header/MenuButtons';
import {NavBar} from '@components/Header/Navbar';
import {SearchBar} from '@components/Header/SearchBar';
import type {ReactElement} from 'react';
import {useState} from 'react';

export function Header(): ReactElement {
	const [isPaletteOpen, setIsPaletteOpen] = useState(false);

	return (
		<header className={'sticky top-0 z-40 w-full bg-primary'}>
			<div
				className={
					'grid w-full grid-cols-1 items-center justify-between gap-2 p-4 md:h-[68px] md:grid-cols-3 md:py-0'
				}>
				<MenuButtons />

				<SearchBar onOpenPalette={() => setIsPaletteOpen(true)} />

				<NavBar />
			</div>
			<CommandPalette
				open={isPaletteOpen}
				onOpenChange={setIsPaletteOpen}
			/>
		</header>
	);
}
