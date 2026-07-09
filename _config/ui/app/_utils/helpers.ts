import {ASSETS_BASE_URI, GITHUB_URI} from '@utils/constants';

import type {TChainInfo} from '@utils/constants';
import type {TLogoFile} from '@utils/types';

export function tokenLogoURI(chainID: string, address: string, file: TLogoFile = 'logo-128.png'): string {
	return `${ASSETS_BASE_URI}/token/${chainID}/${address}/${file}`;
}

export function chainLogoURI(chainID: string, file: TLogoFile = 'logo-128.png'): string {
	return `${ASSETS_BASE_URI}/chain/${chainID}/${file}`;
}

export function tokenGithubURI(chainID: string, address: string): string {
	let folder = address;
	if (address.startsWith('0x')) {
		folder = address.toLowerCase();
	}
	return `${GITHUB_URI}/tree/main/tokens/${chainID}/${folder}`;
}

export function explorerAddressURI(chain: TChainInfo, address: string): string | undefined {
	if (!chain.explorer) {
		return undefined;
	}
	return `${chain.explorer}/address/${address}`;
}

export function tokenPageURI(chainSlug: string, address: string): string {
	return `/${chainSlug}/${address}`;
}

// Append a query string to a path, prefixing `?` only when the query is non-empty.
export function withSearch(path: string, search: string): string {
	if (!search) {
		return path;
	}
	return `${path}?${search}`;
}

export function truncateAddress(address: string, chars = 6): string {
	if (address.length <= chars * 2 + 2) {
		return address;
	}
	return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

// A token is "new" (and shown first, with a badge) for one month after it was added.
export const NEW_TOKEN_WINDOW_SECONDS = 30 * 24 * 60 * 60;

export function isNewToken(addedAt?: number): boolean {
	if (!addedAt) {
		return false;
	}
	return Date.now() / 1000 - addedAt < NEW_TOKEN_WINDOW_SECONDS;
}
