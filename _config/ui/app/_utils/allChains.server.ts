import type {TAllChainInfo} from '@utils/constants';
import allChainsData from '../../public/data/allChains.json';

// Server-only: this embeds the ~40KB `allChains.json` payload, so it must never be imported by a
// client component (the picker fetches `/data/allChains.json` at runtime instead). Used by the
// add-a-network page and API route to resolve and validate the target chain.

export const ALL_CHAINS: TAllChainInfo[] = allChainsData;
export const OFF_CDN_CHAINS: TAllChainInfo[] = ALL_CHAINS.filter(chain => !chain.onCDN);

// An "addable" chain is a known mainnet not yet on the CDN — the only valid target of the
// add-a-network flow. A chain already on the CDN (or unknown) resolves to undefined.
export function findAddableChain(chainID?: string): TAllChainInfo | undefined {
	if (!chainID) {
		return undefined;
	}
	return OFF_CDN_CHAINS.find(chain => chain.id === chainID);
}
