'use client';

import {createContext, useCallback, useContext, useMemo, useState} from 'react';

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

// The view preference is plain UI state: seeded from the cookie the server read (so SSR and
// hydration agree), flipped instantly in client state, and persisted with a client-side cookie
// write — no server action round-trip or server re-render per toggle.
export const WithSettings = ({children, cookieView}: TSettingsProps): ReactElement => {
	const [view, setView] = useState<'grid' | 'list'>(cookieView === 'list' ? 'list' : 'grid');

	const handleViewChange = useCallback((): void => {
		setView(current => {
			const next = current === 'grid' ? 'list' : 'grid';
			document.cookie = `view=${next}; path=/; max-age=31536000; samesite=lax`;
			return next;
		});
	}, []);

	const value = useMemo(() => ({view, handleViewChange}), [view, handleViewChange]);

	return <WithSettingsContext.Provider value={value}>{children}</WithSettingsContext.Provider>;
};

export const useSettings = (): TWithSettings => {
	return useContext(WithSettingsContext);
};
