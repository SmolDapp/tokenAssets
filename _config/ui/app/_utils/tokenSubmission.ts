// Builds and validates a token submission. The on-disk info.json holds ONLY non-derivable data:
// address / chainID / logoURI come from the folder path, so they are never stored here.

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const NON_EVM_CHAINS = new Set(['1151111081099710', 'btcm']);

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
export function toFolderAddress(address: string): string {
	if (address.startsWith('0x')) {
		return address.toLowerCase();
	}
	return address.trim();
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
		return trimmed.length >= 3;
	}
	return EVM_ADDRESS_RE.test(trimmed);
}

export function validateSubmission(input: TSubmissionInput): TValidationError[] {
	const errors: TValidationError[] = [];

	if (!isValidAddress(input.chainID, input.address)) {
		errors.push({field: 'address', message: 'Enter a valid contract address for the selected chain'});
	}
	if (!input.svgText.includes('<svg')) {
		errors.push({field: 'svg', message: 'Upload the token logo as an SVG file'});
	}

	const name = input.name.trim();
	if (!name) {
		errors.push({field: 'name', message: 'Name is required'});
	} else if (name.length > 60) {
		errors.push({field: 'name', message: 'Name must be 60 characters or fewer'});
	}

	const symbol = input.symbol.trim();
	if (!symbol) {
		errors.push({field: 'symbol', message: 'Symbol is required'});
	} else if (symbol.length > 20) {
		errors.push({field: 'symbol', message: 'Symbol must be 20 characters or fewer'});
	} else if (/\s/.test(symbol)) {
		errors.push({field: 'symbol', message: 'Symbol cannot contain spaces'});
	}

	const decimals = Number(input.decimals);
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
		errors.push({field: 'decimals', message: 'Decimals must be a whole number between 0 and 255'});
	}

	const website = input.website.trim();
	if (!website) {
		errors.push({field: 'website', message: 'A project link is required.'});
	} else if (!website.startsWith('http')) {
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
