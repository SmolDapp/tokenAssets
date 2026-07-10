'use client';

import {rankBySearchScore} from '@utils/searchScore';
import {useEffect, useMemo, useState} from 'react';

import type {TSearchEntry} from '@utils/types';

const MAX_RESULTS = 40;

// The global index is fetched once and shared across every hook instance for the session.
let cachedIndex: TSearchEntry[] | null = null;
let indexPromise: Promise<TSearchEntry[]> | null = null;

function loadSearchIndex(): Promise<TSearchEntry[]> {
	if (cachedIndex) {
		return Promise.resolve(cachedIndex);
	}
	if (!indexPromise) {
		indexPromise = fetch('/data/search.json')
			.then(async response => {
				if (!response.ok) {
					throw new Error('Failed to load search index');
				}
				return (await response.json()) as TSearchEntry[];
			})
			.then(entries => {
				cachedIndex = entries;
				return entries;
			})
			.catch(error => {
				// Clear the memo so the next palette open retries, instead of one transient
				// failure disabling global search for the whole session.
				indexPromise = null;
				throw error;
			});
	}
	return indexPromise;
}

export function useGlobalSearch(query: string, enabled: boolean): {results: TSearchEntry[]; hasError: boolean} {
	const [entries, setEntries] = useState<TSearchEntry[]>(() => cachedIndex || []);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		// If another instance already populated the shared index while this one was disabled, adopt it
		// instead of returning early — otherwise this instance stays stuck on its initial empty state.
		if (cachedIndex) {
			setEntries(cachedIndex);
			setHasError(false);
			return;
		}
		let isCancelled = false;
		setHasError(false);
		loadSearchIndex()
			.then(loaded => {
				if (!isCancelled) {
					setEntries(loaded);
				}
			})
			.catch(error => {
				console.error(error);
				// Surface the failure so the palette can offer a retry instead of showing a
				// misleading "no results" state. loadSearchIndex already cleared its memo, so
				// re-enabling (reopening the palette) retries the fetch.
				if (!isCancelled) {
					setHasError(true);
				}
			});
		return () => {
			isCancelled = true;
		};
	}, [enabled]);

	const results = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) {
			return [];
		}
		return rankBySearchScore(entries, normalized).slice(0, MAX_RESULTS);
	}, [entries, query]);

	return {results, hasError};
}
