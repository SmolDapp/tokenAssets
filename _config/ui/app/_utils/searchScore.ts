type TSearchable = {symbol?: string; name?: string; address: string; mcap?: number};

// Relevance tiers (lower = better): exact symbol, symbol/name prefix, substring, then address.
// Returns null when the token does not match the query at all.
export function getSearchScore(token: TSearchable, query: string): number | null {
	const symbol = token.symbol?.toLowerCase() || '';
	const name = token.name?.toLowerCase() || '';
	const address = token.address.toLowerCase();

	if (symbol === query) {
		return 0;
	}
	if (symbol.startsWith(query)) {
		return 1;
	}
	if (name.startsWith(query)) {
		return 2;
	}
	if (symbol.includes(query)) {
		return 3;
	}
	if (name.includes(query)) {
		return 4;
	}
	if (address.startsWith(query) || address.startsWith(`0x${query}`)) {
		return 5;
	}
	if (address.includes(query)) {
		return 6;
	}
	return null;
}

// Filter to the items that match `query`, ordered by relevance tier then market cap. Shared by the
// per-chain list (useTokens) and the global palette (useGlobalSearch) so ranking stays identical.
export function rankBySearchScore<T extends TSearchable>(items: T[], query: string): T[] {
	return items
		.map(item => ({item, score: getSearchScore(item, query)}))
		.filter((entry): entry is {item: T; score: number} => entry.score !== null)
		.sort((first, second) => first.score - second.score || (second.item.mcap || 0) - (first.item.mcap || 0))
		.map(entry => entry.item);
}
