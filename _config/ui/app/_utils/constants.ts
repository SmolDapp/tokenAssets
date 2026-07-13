import type {TLogoFile} from '@utils/types';
import allChainsData from '../../public/data/allChains.json';
import chainsData from '../../public/data/chains.json';

export type TChainInfo = {
	id: string;
	name: string;
	slug: string;
	count: number;
	explorer?: string;
};

// Every EVM mainnet (superset of the CDN chains), used by the "add a network" flow to surface
// chains not yet on the CDN and to pre-fill their native-token metadata.
export type TAllChainInfo = {
	id: string;
	name: string;
	nativeName: string;
	nativeSymbol: string;
	nativeDecimals: number;
	onCDN: boolean;
};

export const LOGO_FORMATS: {label: string; file: TLogoFile}[] = [
	{label: 'SVG', file: 'logo.svg'},
	{label: 'PNG 32', file: 'logo-32.png'},
	{label: 'PNG 128', file: 'logo-128.png'}
];

export const CHAINS: TChainInfo[] = chainsData.chains;
export const ALL_CHAINS: TAllChainInfo[] = allChainsData;
export const OFF_CDN_CHAINS: TAllChainInfo[] = ALL_CHAINS.filter(chain => !chain.onCDN);
export const TOTAL_TOKENS: number = chainsData.totalTokens;
export const DEFAULT_CHAIN: TChainInfo = CHAINS.find(chain => chain.slug === 'ethereum') || CHAINS[0];

// The app is served from tokens.smold.app; the logo CDN is a separate host (assets.smold.app).
export const SITE_URI = 'https://tokens.smold.app';
export const ASSETS_BASE_URI = 'https://assets.smold.app';
export const GITHUB_URI = 'https://github.com/SmolDapp/tokenAssets';
export const SMOLD_APP_URI = 'https://smold.app';
export const BRAND_GREEN = '#123524';

export function findChainBySlug(slug?: string): TChainInfo | undefined {
	if (!slug) {
		return undefined;
	}
	return CHAINS.find(chain => chain.slug === slug.toLowerCase());
}

// An "addable" chain is a known mainnet not yet on the CDN — the only valid target of the
// add-a-network flow. A chain already on the CDN (or unknown) resolves to undefined.
export function findAddableChain(chainID?: string): TAllChainInfo | undefined {
	if (!chainID) {
		return undefined;
	}
	return OFF_CDN_CHAINS.find(chain => chain.id === chainID);
}
