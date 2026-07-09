export type TToken = {
	address: string;
	name?: string;
	symbol?: string;
	decimals?: number;
	// Epoch seconds when the token logo was first committed to the repo (recency signal).
	addedAt?: number;
	// Aggregated market cap in USD from DefiLlama (popularity signal).
	mcap?: number;
};

// One token on one chain, flattened into the global cross-chain search index.
export type TSearchEntry = {
	chainID: string;
	address: string;
	symbol?: string;
	name?: string;
	mcap?: number;
};

export type TLogoFile = 'logo.svg' | 'logo-32.png' | 'logo-128.png';
