import {http, createPublicClient, erc20Abi, getAddress, hexToString} from 'viem';

// bytes32 variant for legacy tokens (MKR and friends) that return name/symbol as bytes32
// instead of string. viem throws decoding those with the standard ABI, so we retry with this.
const erc20Bytes32Abi = [
	{constant: true, inputs: [], name: 'name', outputs: [{name: '', type: 'bytes32'}], type: 'function'},
	{constant: true, inputs: [], name: 'symbol', outputs: [{name: '', type: 'bytes32'}], type: 'function'}
] as const;

// CORS-enabled public RPCs, keyed by chain ID. Only chains served with a reliable browser-reachable
// endpoint are listed; any chain absent here falls back to manual metadata entry in the form.
const RPC_BY_CHAIN: Record<string, string> = {
	1: 'https://ethereum-rpc.publicnode.com',
	10: 'https://optimism-rpc.publicnode.com',
	56: 'https://bsc-rpc.publicnode.com',
	100: 'https://gnosis-rpc.publicnode.com',
	130: 'https://unichain-rpc.publicnode.com',
	137: 'https://polygon-bor-rpc.publicnode.com',
	146: 'https://sonic-rpc.publicnode.com',
	250: 'https://fantom-rpc.publicnode.com',
	8453: 'https://base-rpc.publicnode.com',
	42161: 'https://arbitrum-one-rpc.publicnode.com',
	42220: 'https://celo-rpc.publicnode.com',
	43114: 'https://avalanche-c-chain-rpc.publicnode.com',
	59144: 'https://linea-rpc.publicnode.com',
	81457: 'https://blast-rpc.publicnode.com',
	534352: 'https://scroll-rpc.publicnode.com'
};

export type TOnchainToken = {
	name: string;
	symbol: string;
	decimals: number;
};

export function canFetchOnchain(chainID: string): boolean {
	return Boolean(RPC_BY_CHAIN[chainID]);
}

// bytes32 names are right-padded with null bytes; keep only the text before the first null byte.
function decodeBytes32(raw: `0x${string}`): string {
	const decoded = hexToString(raw);
	let result = '';
	for (const char of decoded) {
		if (char.charCodeAt(0) === 0) {
			break;
		}
		result += char;
	}
	return result.trim();
}

// Reads name/symbol/decimals straight from the contract. Decimals is required (a failure means the
// address is not a readable ERC-20 on this chain); name/symbol degrade through the bytes32 fallback.
export async function fetchOnchainToken(chainID: string, address: string): Promise<TOnchainToken> {
	const rpcURL = RPC_BY_CHAIN[chainID];
	if (!rpcURL) {
		throw new Error('On-chain fetch is not available for this chain — fill the fields manually');
	}
	// Cap each RPC call so a hung/slow public endpoint surfaces as an error (→ metaStatus 'error')
	// instead of leaving the submit flow spinning indefinitely.
	const client = createPublicClient({transport: http(rpcURL, {timeout: 10_000})});
	const checksummed = getAddress(address);
	const contract = {address: checksummed, abi: erc20Abi} as const;

	// The three reads are independent — one round-trip of latency instead of three. Each
	// string read keeps its own bytes32 fallback for legacy tokens (MKR and friends).
	const readStringWithBytes32Fallback = async (functionName: 'name' | 'symbol'): Promise<string> => {
		try {
			return await client.readContract({...contract, functionName});
		} catch {
			const raw = await client.readContract({address: checksummed, abi: erc20Bytes32Abi, functionName});
			return decodeBytes32(raw as `0x${string}`);
		}
	};

	const [decimals, name, symbol] = await Promise.all([
		client.readContract({...contract, functionName: 'decimals'}),
		readStringWithBytes32Fallback('name'),
		readStringWithBytes32Fallback('symbol')
	]);

	return {name, symbol, decimals: Number(decimals)};
}
