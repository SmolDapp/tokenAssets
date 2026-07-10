// Builds and validates a token submission. The on-disk info.json holds ONLY non-derivable data:
// address / chainID / logoURI come from the folder path, so they are never stored here.

import {isForbiddenSvg} from '@utils/svgSafety';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const NON_EVM_CHAINS = new Set(['1151111081099710', 'btcm']);
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// The address flows into the PR file path and body, so a loose check would allow "/" or backticks to
// inject a path or markdown. Base58 (Solana) decodes to a 32-byte pubkey and its alphabet excludes
// "/", whitespace, backticks and brackets, so validating it also closes those injection paths.
function base58Decode(value: string): number[] | null {
	const bytes: number[] = [];
	for (const char of value) {
		let carry = BASE58_ALPHABET.indexOf(char);
		if (carry === -1) {
			return null;
		}
		for (let j = 0; j < bytes.length; j++) {
			carry += bytes[j] * 58;
			bytes[j] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			bytes.push(carry & 0xff);
			carry >>= 8;
		}
	}
	for (let i = 0; i < value.length && value[i] === '1'; i++) {
		bytes.push(0);
	}
	return bytes;
}

function isValidSolanaAddress(value: string): boolean {
	return base58Decode(value)?.length === 32;
}

export type TTokenInfo = {
	name: string;
	symbol: string;
	decimals: number;
	description?: string;
	website?: string;
	tags?: string[];
};

export type TSubmissionInput = {
	chainID: string;
	address: string;
	svgText: string;
	name: string;
	symbol: string;
	decimals: string;
	description: string;
	website: string;
};

export type TValidationError = {
	field: 'address' | 'svg' | 'name' | 'symbol' | 'decimals' | 'website';
	message: string;
};

export function isNonEvmChain(chainID: string): boolean {
	return NON_EVM_CHAINS.has(chainID);
}

// EVM folders are lowercased; non-EVM (Solana) addresses are case-sensitive and kept verbatim.
// Trimmed first so a pasted address with stray whitespace maps to the same folder the
// validation saw, instead of leaking the raw string into the path.
export function toFolderAddress(address: string): string {
	const trimmed = address.trim();
	if (trimmed.startsWith('0x')) {
		return trimmed.toLowerCase();
	}
	return trimmed;
}

export function parseTags(raw: string): string[] {
	return raw
		.split(',')
		.map(tag => tag.trim().toLowerCase())
		.filter(Boolean);
}

export function isValidAddress(chainID: string, address: string): boolean {
	const trimmed = address.trim();
	if (isNonEvmChain(chainID)) {
		return isValidSolanaAddress(trimmed);
	}
	return EVM_ADDRESS_RE.test(trimmed);
}

// The name/symbol/decimals checks alone — used both by the full validation and by the submit form
// to decide whether RPC-fetched metadata is usable or the manual-entry fields must be shown.
export function validateTokenMeta(name: string, symbol: string, decimals: string): TValidationError[] {
	const errors: TValidationError[] = [];

	const trimmedName = name.trim();
	if (!trimmedName) {
		errors.push({field: 'name', message: 'Name is required'});
	} else if (trimmedName.length > 60) {
		errors.push({field: 'name', message: 'Name must be 60 characters or fewer'});
	}

	const trimmedSymbol = symbol.trim();
	if (!trimmedSymbol) {
		errors.push({field: 'symbol', message: 'Symbol is required'});
	} else if (trimmedSymbol.length > 20) {
		errors.push({field: 'symbol', message: 'Symbol must be 20 characters or fewer'});
	} else if (/\s/.test(trimmedSymbol)) {
		errors.push({field: 'symbol', message: 'Symbol cannot contain spaces'});
	}

	// Validate the string form before coercing: Number('') and Number('  ') are 0, which would
	// silently pass and publish `decimals: 0`.
	const decimalsRaw = decimals.trim();
	if (!/^\d{1,3}$/.test(decimalsRaw) || Number(decimalsRaw) > 255) {
		errors.push({field: 'decimals', message: 'Decimals must be a whole number between 0 and 255'});
	}

	return errors;
}

export function validateSubmission(input: TSubmissionInput): TValidationError[] {
	const errors: TValidationError[] = [];

	if (!isValidAddress(input.chainID, input.address)) {
		errors.push({field: 'address', message: 'Enter a valid contract address for the selected chain'});
	}
	if (!input.svgText.includes('<svg')) {
		errors.push({field: 'svg', message: 'Upload the token logo as an SVG file'});
	} else if (isForbiddenSvg(input.svgText)) {
		errors.push({
			field: 'svg',
			message: 'The SVG must be a pure vector — no scripts, event handlers, external links or embedded rasters.'
		});
	} else if (new TextEncoder().encode(input.svgText).length > 153_600) {
		// Byte length (not UTF-16 code units) so client, server and the CI's `wc -c` cap agree:
		// a multibyte SVG under 153,600 code units can still exceed 150KB on disk.
		errors.push({field: 'svg', message: 'The SVG must be under 150KB'});
	}

	errors.push(...validateTokenMeta(input.name, input.symbol, input.decimals));

	const website = input.website.trim();
	if (!website) {
		errors.push({field: 'website', message: 'A project link is required.'});
	} else if (!/^https?:\/\//i.test(website)) {
		errors.push({field: 'website', message: 'Project link must start with http:// or https://.'});
	}

	return errors;
}

// Assumes the input already passed validateSubmission. Empty optionals are omitted, not written as blanks.
export function buildInfoJson(input: TSubmissionInput, tags: string[]): string {
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
	return `${JSON.stringify(info, null, 2)}\n`;
}
