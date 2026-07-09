'use client';

import {createContext, useCallback, useContext, useMemo} from 'react';

import {setCookieView} from './WithSettings.server';

import type {ReactElement, ReactNode} from 'react';

type TWithSettings = {
	view: 'grid' | 'list';
	handleViewChange: () => void;
};

const WithSettingsContext = createContext<TWithSettings>({
	view: 'grid',
	handleViewChange: (): void => void 0
});

type TSettingsProps = {
	children: ReactNode;
	cookieView: string;
};

export const WithSettings = ({children, cookieView}: TSettingsProps): ReactElement => {
	const isGridView = cookieView === 'grid';
	const handleViewChange = useCallback((): void => {
		if (isGridView) {
			setCookieView('list');
			return;
		}
		setCookieView('grid');
	}, [isGridView]);

	let view: 'grid' | 'list' = 'list';
	if (isGridView) {
		view = 'grid';
	}

	const value = useMemo(() => ({view, handleViewChange}), [view, handleViewChange]);

	return <WithSettingsContext.Provider value={value}>{children}</WithSettingsContext.Provider>;
};

export const useSettings = (): TWithSettings => {
	const ctx = useContext(WithSettingsContext);
	if (!ctx) {
		throw new Error('WithSettingsContext not found');
	}
	return ctx;
};
