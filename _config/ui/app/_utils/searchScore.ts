type TSearchable = {symbol?: string; name?: string; address: string};

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
