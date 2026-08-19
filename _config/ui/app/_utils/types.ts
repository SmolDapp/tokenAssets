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

// The cross-entry audit, produced by scripts/auditTokens.mjs into public/data/audit.json.
export type TAuditFamily = 'shared-logo' | 'divergent-logo' | 'image-integrity' | 'metadata';
export type TAuditSeverity = 'high' | 'medium' | 'low';

export type TAuditFinding = {
	family: TAuditFamily;
	// The specific rule that fired, e.g. 'same-address-different-logo'. Free-form so the script can
	// add a rule without the page needing to know about it.
	check: string;
	severity: TAuditSeverity;
	title: string;
	detail: string;
	// The tokens the finding is about. One for a per-token check, several for a comparison.
	entries: TSearchEntry[];
};

export type TAuditReport = {
	generatedAt: string;
	tokenCount: number;
	skippedPixels: boolean;
	totals: {byFamily: Record<string, number>; byCheck: Record<string, number>};
	findings: TAuditFinding[];
};
