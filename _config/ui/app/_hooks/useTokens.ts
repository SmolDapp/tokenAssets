'use client';

import {CHAINS} from '@utils/constants';
import {isNewToken} from '@utils/helpers';
import {rankBySearchScore} from '@utils/searchScore';
import type {TToken} from '@utils/types';
import {useCallback, useEffect, useMemo, useState} from 'react';

const PAGE_SIZE = 60;
const tokensCache = new Map<string, TToken[]>();
// Dedup concurrent fetches of the same chain (e.g. the list + a drawer mounting together) so the
// JSON is downloaded once; the shared promise resolves everyone and is dropped when it settles.
const inflight = new Map<string, Promise<TToken[]>>();

function loadChainTokens(chainID: string): Promise<TToken[]> {
	const cached = tokensCache.get(chainID);
	if (cached) {
		return Promise.resolve(cached);
	}
	const existing = inflight.get(chainID);
	if (existing) {
		return existing;
	}
	const promise = fetch(`/data/tokens/${chainID}.json`)
		.then(async response => {
			if (!response.ok) {
				throw new Error(`Failed to load tokens for chain ${chainID}`);
			}
			return (await response.json()) as TToken[];
		})
		.then(tokens => {
			tokensCache.set(chainID, tokens);
			return tokens;
		})
		.finally(() => {
			inflight.delete(chainID);
		});
	inflight.set(chainID, promise);
	return promise;
}

// Biggest market cap first; a missing market cap counts as 0.
function byMcapDesc(first: TToken, second: TToken): number {
	return (second.mcap || 0) - (first.mcap || 0);
}

// Default (no-search) order, two deterministic tiers:
//  1. Recently added tokens (< 1 month, flagged "new" in the UI), newest first; market cap breaks
//     ties so a bulk import (hundreds of tokens sharing one addedAt) still surfaces recognizable
//     tokens first instead of burying the ranking alphabetically for a month.
//  2. Everything else by market cap, biggest first; tokens without a market cap fall to
//     the bottom, sorted alphabetically for a stable order.
function rankTokens(tokens: TToken[]): TToken[] {
	const recent = [];
	const rest = [];
	for (const token of tokens) {
		if (isNewToken(token.addedAt)) {
			recent.push(token);
		} else {
			rest.push(token);
		}
	}

	recent.sort((first, second) => (second.addedAt || 0) - (first.addedAt || 0) || byMcapDesc(first, second));
	rest.sort((first, second) => {
		const mcapDiff = byMcapDesc(first, second);
		if (mcapDiff !== 0) {
			return mcapDiff;
		}
		return (first.symbol || first.address).localeCompare(second.symbol || second.address);
	});

	return [...recent, ...rest];
}

type TUseTokensResult = {
	tokens: TToken[];
	isLoading: boolean;
	hasError: boolean;
	hasNextPage: boolean;
	fetchNextPage: () => void;
	findToken: (address: string) => TToken | undefined;
};

export function useTokens(chainID: string, searchQuery = ''): TUseTokensResult {
	const [allTokens, setAllTokens] = useState<TToken[]>(() => tokensCache.get(chainID) || []);
	const [isLoading, setIsLoading] = useState(() => !tokensCache.has(chainID));
	const [hasError, setHasError] = useState(false);
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	useEffect(() => {
		// Resolve through the CHAINS allowlist and fetch with the canonical id, so a user-controlled
		// chainID (route param) can never steer the request URL anywhere else.
		const knownChainID = CHAINS.find(chain => chain.id === chainID)?.id;
		if (!knownChainID) {
			setAllTokens([]);
			setIsLoading(false);
			return;
		}

		const cached = tokensCache.get(knownChainID);
		if (cached) {
			setAllTokens(cached);
			setIsLoading(false);
			setHasError(false);
			return;
		}

		let isCancelled = false;
		setIsLoading(true);
		setHasError(false);
		setAllTokens([]);

		loadChainTokens(knownChainID)
			.then(tokens => {
				if (!isCancelled) {
					setAllTokens(tokens);
					setIsLoading(false);
				}
			})
			.catch(error => {
				console.error(error);
				if (!isCancelled) {
					setAllTokens([]);
					setHasError(true);
					setIsLoading(false);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [chainID]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination on chain/search change
	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
	}, [chainID, searchQuery]);

	// Ranked once per chain load (stable across renders), so the default order does not
	// re-rank on unrelated re-renders and keeps image memoization intact.
	const rankedTokens = useMemo(() => rankTokens(allTokens), [allTokens]);

	const filteredTokens = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return rankedTokens;
		}
		return rankBySearchScore(allTokens, query);
	}, [allTokens, rankedTokens, searchQuery]);

	const visibleTokens = useMemo(() => filteredTokens.slice(0, visibleCount), [filteredTokens, visibleCount]);

	const fetchNextPage = useCallback(() => {
		setVisibleCount(count => count + PAGE_SIZE);
	}, []);

	const findToken = useCallback(
		(address: string): TToken | undefined => {
			return allTokens.find(token => token.address.toLowerCase() === address.toLowerCase());
		},
		[allTokens]
	);

	return {
		tokens: visibleTokens,
		isLoading,
		hasError,
		hasNextPage: visibleCount < filteredTokens.length,
		fetchNextPage,
		findToken
	};
}
