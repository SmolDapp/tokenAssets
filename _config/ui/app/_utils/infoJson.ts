// Reads and writes the on-disk info.json of a token. It holds ONLY non-derivable data: address,
// chainID and logoURI come from the folder path, so they are never stored in it.

import type {TSubmissionInput} from '@utils/tokenSubmission';

export type TTokenInfo = {
	name: string;
	symbol: string;
	decimals: number;
	description?: string;
	website?: string;
	tags?: string[];
};

const ALLOWED_INFO_KEYS = new Set(['name', 'symbol', 'decimals', 'description', 'website', 'tags']);

// Builds a TTokenInfo from raw form values. Empty optionals are omitted, not written as blanks.
function infoFromInput(input: TSubmissionInput, tags: string[]): TTokenInfo {
	const info: TTokenInfo = {
		name: input.name.trim(),
		symbol: input.symbol.trim(),
		decimals: Number(input.decimals)
	};
	const description = input.description.trim();
	if (description) {
		info.description = description;
	}
	const website = input.website.trim();
	if (website) {
		info.website = website;
	}
	if (tags.length > 0) {
		info.tags = tags;
	}
	return info;
}

// The single serializer. Key order and the trailing newline are load-bearing: every info.json on disk
// round-trips through this byte for byte, which is what keeps an edit to one field a one-line diff
// instead of a whole-file rewrite.
export function serializeInfoJson(info: TTokenInfo): string {
	const ordered: TTokenInfo = {
		name: info.name,
		symbol: info.symbol,
		decimals: info.decimals
	};
	if (info.description) {
		ordered.description = info.description;
	}
	if (info.website) {
		ordered.website = info.website;
	}
	if (info.tags && info.tags.length > 0) {
		ordered.tags = info.tags;
	}
	return `${JSON.stringify(ordered, null, 2)}\n`;
}

// Strict mirror of the schema enforced by .github/scripts/verify-tokens.mjs and the inline VALIDATE_SCRIPT
// in .github/workflows/verify-fork.yml — KEEP ALL THREE COPIES IN SYNC.
// Returns null on anything it does not fully model, including an unknown key. Rejecting rather than
// dropping matters: re-serializing a file whose keys we don't carry would silently erase them.
export function parseInfoJson(raw: string): TTokenInfo | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return null;
	}
	const record = parsed as Record<string, unknown>;
	for (const key of Object.keys(record)) {
		if (!ALLOWED_INFO_KEYS.has(key)) {
			return null;
		}
	}
	const {name, symbol, decimals, description, website, tags} = record;
	if (typeof name !== 'string' || !name || typeof symbol !== 'string' || !symbol) {
		return null;
	}
	if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0) {
		return null;
	}
	const info: TTokenInfo = {name, symbol, decimals};
	if (description !== undefined) {
		if (typeof description !== 'string') {
			return null;
		}
		info.description = description;
	}
	if (website !== undefined) {
		if (typeof website !== 'string') {
			return null;
		}
		info.website = website;
	}
	if (tags !== undefined) {
		if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) {
			return null;
		}
		info.tags = tags as string[];
	}
	return info;
}

type TMergeParams = {
	base: TTokenInfo | null;
	input: TSubmissionInput;
	tags: string[];
};

// Produces the info.json an edit writes. An edit always replaces the whole file, so every optional
// field comes from the request — leaving one empty removes it. Only name/symbol/decimals are carried
// over from the base: they are on-chain truth and not editable through this form, and taking them from
// the file rather than from the request is what makes that lock real instead of cosmetic.
export function mergeTokenInfo({base, input, tags}: TMergeParams): TTokenInfo {
	const replacement = infoFromInput(input, tags);
	if (!base) {
		return replacement;
	}
	return {
		...replacement,
		name: base.name,
		symbol: base.symbol,
		decimals: base.decimals
	};
}
