'use client';

import {getSearchScore} from '@utils/searchScore';
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
			});
	}
	return indexPromise;
}

export function useGlobalSearch(query: string, enabled: boolean): {results: TSearchEntry[]; isLoading: boolean} {
	const [entries, setEntries] = useState<TSearchEntry[]>(() => cachedIndex || []);
	const [isLoading, setIsLoading] = useState(() => cachedIndex === null);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		// If another instance already populated the shared index while this one was disabled, adopt it
		// instead of returning early — otherwise this instance stays stuck on its initial empty/loading
		// state forever.
		if (cachedIndex) {
			setEntries(cachedIndex);
			setIsLoading(false);
			return;
		}
		let isCancelled = false;
		loadSearchIndex()
			.then(loaded => {
				if (!isCancelled) {
					setEntries(loaded);
					setIsLoading(false);
				}
			})
			.catch(error => {
				console.error(error);
				if (!isCancelled) {
					setIsLoading(false);
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
		return entries
			.map(entry => ({entry, score: getSearchScore(entry, normalized)}))
			.filter(item => item.score !== null)
			.sort((first, second) => {
				const scoreDiff = (first.score as number) - (second.score as number);
				if (scoreDiff !== 0) {
					return scoreDiff;
				}
				return (second.entry.mcap || 0) - (first.entry.mcap || 0);
			})
			.slice(0, MAX_RESULTS)
			.map(item => item.entry);
	}, [entries, query]);

	return {results, isLoading};
}
