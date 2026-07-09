import fs from 'node:fs';
import path from 'node:path';

import {CHAINS} from '@utils/constants';

import type {TToken} from '@utils/types';

const GAS_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const chainTokensCache = new Map<string, TToken[]>();

export function readChainTokens(chainID: string): TToken[] {
	// chainID reaches this from route params, so it is user-controlled: resolve it through the
	// CHAINS allowlist and use the canonical id, so no user-derived string ever becomes part of
	// a filesystem path (path traversal).
	const knownChainID = CHAINS.find(chain => chain.id === chainID)?.id;
	if (!knownChainID) {
		return [];
	}
	const cached = chainTokensCache.get(knownChainID);
	if (cached) {
		return cached;
	}
	try {
		const file = path.join(process.cwd(), 'public', 'data', 'tokens', `${knownChainID}.json`);
		const tokens = JSON.parse(fs.readFileSync(file, 'utf8')) as TToken[];
		chainTokensCache.set(knownChainID, tokens);
		return tokens;
	} catch {
		return [];
	}
}

export function findToken(chainID: string, address: string): TToken | undefined {
	const target = address.toLowerCase();
	return readChainTokens(chainID).find(token => token.address.toLowerCase() === target);
}

// A random selection for the hero wall, drawn from the highest-market-cap Ethereum tokens
// (recognizable logos, no cross-chain badge overlays). Deduped by address, then shuffled so
// the wall varies between renders — pulled from a pool of 2×count to keep some variety.
export function getFeaturedTokens(count: number): {chainID: string; address: string}[] {
	const seen = new Set<string>();
	const pool: TToken[] = [];
	for (const token of readChainTokens('1')) {
		const address = token.address.toLowerCase();
		if (!token.mcap || !token.symbol || address === GAS_TOKEN || seen.has(address)) {
			continue;
		}
		seen.add(address);
		pool.push(token);
	}

	pool.sort((first, second) => (second.mcap || 0) - (first.mcap || 0));
	const top = pool.slice(0, count * 2);
	for (let i = top.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const swap = top[i];
		top[i] = top[j];
		top[j] = swap;
	}

	return top.slice(0, count).map(token => ({chainID: '1', address: token.address}));
}
