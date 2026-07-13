import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPublicClient, erc20Abi, getAddress, http} from 'viem';
import * as viemChains from 'viem/chains';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TOKENS_DIR = path.join(ROOT_DIR, 'tokens');
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const TOKENLISTS_URI = 'https://raw.githubusercontent.com/SmolDapp/tokenLists/main/lists';
const MULTICALL_CHUNK_SIZE = 100;
const MCAP_URI = 'https://coins.llama.fi/mcaps';
const MCAP_CHUNK_SIZE = 100;

// Numeric chain ID → DefiLlama chain slug, for the market-cap popularity signal.
// Only chains DefiLlama indexes are listed; unmapped chains simply get no popularity.
const CHAINID_TO_DEFILLAMA = {
	1: 'ethereum',
	10: 'optimism',
	56: 'bsc',
	100: 'xdai',
	130: 'unichain',
	137: 'polygon',
	146: 'sonic',
	250: 'fantom',
	252: 'fraxtal',
	324: 'era',
	1101: 'polygon_zkevm',
	1135: 'lisk',
	1868: 'soneium',
	1923: 'swell',
	5000: 'mantle',
	5330: 'superseed',
	8453: 'base',
	34443: 'mode',
	42161: 'arbitrum',
	42220: 'celo',
	43114: 'avax',
	57073: 'ink',
	59144: 'linea',
	60808: 'bob',
	80094: 'berachain',
	81457: 'blast',
	534352: 'scroll',
	747474: 'katana',
	1151111081099710: 'solana'
};

// Some viem default RPCs are unreliable (e.g. mainnet's eth.merkle.io is Cloudflare rate-limited).
// Override here, or with a RPC_URI_FOR_<chainID> environment variable.
const RPC_OVERRIDES = {
	1: 'https://ethereum-rpc.publicnode.com'
};

const CHAIN_NAMES = {
	1: 'Ethereum',
	10: 'Optimism',
	56: 'BSC',
	100: 'Gnosis',
	130: 'Unichain',
	137: 'Polygon',
	146: 'Sonic',
	223: 'BSquared',
	250: 'Fantom',
	252: 'Fraxtal',
	324: 'ZkSync Era',
	957: 'Derive',
	964: 'Subtensor EVM',
	1101: 'Polygon zkEVM',
	1135: 'Lisk',
	1750: 'Metal L2',
	1868: 'Soneium',
	1923: 'Swellchain',
	3338: 'Peaq',
	4663: 'Robinhood',
	5000: 'Mantle',
	5330: 'Superseed',
	8453: 'Base',
	34443: 'Mode',
	42161: 'Arbitrum',
	42220: 'Celo',
	43114: 'Avalanche',
	50104: 'Sophon',
	57073: 'Ink',
	59144: 'Linea',
	60808: 'BOB',
	80094: 'Berachain',
	81457: 'Blast',
	98866: 'Plume',
	534352: 'Scroll',
	747474: 'Katana',
	1380012617: 'Rari',
	1151111081099710: 'Solana',
	btcm: 'Bitcoin'
};

function toSlug(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function listChainDirectories() {
	return fs
		.readdirSync(TOKENS_DIR, {withFileTypes: true})
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name);
}

function listTokenAddresses(chainID) {
	return fs
		.readdirSync(path.join(TOKENS_DIR, chainID), {withFileTypes: true})
		.filter(entry => entry.isDirectory())
		.map(entry => entry.name);
}

// Last-resort metadata: the token's own info.json on disk, for chains absent from both the
// tokenLists source and viem (e.g. Robinhood 4663), which would otherwise index nameless.
function readLocalInfo(chainID, address) {
	try {
		const raw = fs.readFileSync(path.join(TOKENS_DIR, chainID, address, 'info.json'), 'utf8');
		const info = JSON.parse(raw);
		return {name: info.name, symbol: info.symbol, decimals: info.decimals};
	} catch {
		return undefined;
	}
}

function toDisplayAddress(address) {
	if (!address.startsWith('0x')) {
		return address;
	}
	try {
		return getAddress(address);
	} catch {
		return address;
	}
}

// name/symbol from remote tokenlists or on-chain reads are untrusted: trim and clamp to the same
// limits the submit form enforces so a hostile/malformed source can't bloat the shipped index.
function clampString(value, max) {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	return trimmed.slice(0, max);
}

function normalizeDecimals(value) {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 0 || n > 255) {
		return undefined;
	}
	return n;
}

// One pass over the whole git history to get each token's "added" date (epoch seconds).
// Keyed by `${chainID}/${folderName}` so it matches the on-disk folder (Solana is
// case-sensitive; EVM folders are already lowercase). Requires full history — CI must
// checkout with fetch-depth: 0, otherwise every date collapses to the last commit.
function buildAddedAtMap() {
	const map = new Map();
	try {
		// On a shallow clone (e.g. a deploy environment) the boundary commit diffs against the
		// empty tree, so EVERY token would report as "added" at that commit's date — flagging the
		// whole catalog as new and destroying the market-cap default ranking. No dates is the
		// graceful version of that failure: no NEW badges, ranking intact.
		const isShallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
			cwd: ROOT_DIR,
			encoding: 'utf8'
		}).trim();
		if (isShallow === 'true') {
			console.warn(
				'⚠ shallow git clone detected, addedAt will be empty (checkout with fetch-depth: 0 for real dates)'
			);
			return map;
		}
		const output = execFileSync(
			'git',
			['log', '--diff-filter=A', '--name-only', '--format=COMMIT %at', '--', 'tokens'],
			{cwd: ROOT_DIR, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024}
		);
		let currentEpoch = 0;
		for (const line of output.split('\n')) {
			if (line.startsWith('COMMIT ')) {
				currentEpoch = Number(line.slice(7));
				continue;
			}
			if (!line.endsWith('/logo.svg')) {
				continue;
			}
			const parts = line.split('/');
			if (parts.length !== 4 || parts[0] !== 'tokens') {
				continue;
			}
			const key = `${parts[1]}/${parts[2]}`;
			const existing = map.get(key);
			if (existing === undefined || currentEpoch < existing) {
				map.set(key, currentEpoch);
			}
		}
	} catch (error) {
		console.warn(`⚠ git history unavailable, addedAt will be empty: ${error.message}`);
	}
	return map;
}

async function fetchTokenListMetadata(chainID) {
	const metadata = new Map();
	try {
		const response = await fetch(`${TOKENLISTS_URI}/${chainID}.json`);
		if (!response.ok) {
			return metadata;
		}
		const list = await response.json();
		for (const token of list.tokens || []) {
			metadata.set(token.address.toLowerCase(), {
				name: token.name,
				symbol: token.symbol,
				decimals: token.decimals
			});
		}
	} catch (error) {
		console.warn(`⚠ tokenLists fetch failed for chain ${chainID}: ${error.message}`);
	}
	return metadata;
}

function getViemChain(chainID) {
	const numericID = Number(chainID);
	if (!Number.isFinite(numericID)) {
		return undefined;
	}
	return Object.values(viemChains).find(chain => chain?.id === numericID);
}

async function fetchOnchainMetadata(chainID, addresses) {
	const metadata = new Map();
	if (addresses.length === 0) {
		return metadata;
	}
	const chain = getViemChain(chainID);
	if (!chain?.contracts?.multicall3) {
		return metadata;
	}

	const rpcURI = process.env[`RPC_URI_FOR_${chainID}`] || RPC_OVERRIDES[chainID];
	const client = createPublicClient({chain, transport: http(rpcURI, {timeout: 8_000, retryCount: 1})});
	for (let index = 0; index < addresses.length; index += MULTICALL_CHUNK_SIZE) {
		const chunk = addresses.slice(index, index + MULTICALL_CHUNK_SIZE);
		try {
			const results = await client.multicall({
				contracts: chunk.flatMap(address => [
					{address, abi: erc20Abi, functionName: 'name'},
					{address, abi: erc20Abi, functionName: 'symbol'},
					{address, abi: erc20Abi, functionName: 'decimals'}
				])
			});
			chunk.forEach((address, chunkIndex) => {
				const [name, symbol, decimals] = results.slice(chunkIndex * 3, chunkIndex * 3 + 3);
				if (name.status !== 'success' && symbol.status !== 'success') {
					return;
				}
				const entry = {};
				if (name.status === 'success') {
					entry.name = name.result;
				}
				if (symbol.status === 'success') {
					entry.symbol = symbol.result;
				}
				if (decimals.status === 'success') {
					entry.decimals = Number(decimals.result);
				}
				metadata.set(address.toLowerCase(), entry);
			});
		} catch (error) {
			console.warn(`⚠ multicall failed for chain ${chainID}: ${error.message}`);
			return metadata;
		}
	}
	return metadata;
}

// Market cap (USD) per token from DefiLlama, used as the popularity signal. Keyless,
// batched. Best-effort: unknown tokens are simply absent, failures leave popularity empty.
async function fetchMarketCaps(chainID, addresses) {
	const marketCaps = new Map();
	const slug = CHAINID_TO_DEFILLAMA[chainID];
	if (!slug || addresses.length === 0) {
		return marketCaps;
	}

	for (let index = 0; index < addresses.length; index += MCAP_CHUNK_SIZE) {
		const chunk = addresses.slice(index, index + MCAP_CHUNK_SIZE);
		const coins = chunk.map(address => `${slug}:${address}`);
		try {
			const response = await fetch(MCAP_URI, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({coins})
			});
			if (!response.ok) {
				continue;
			}
			const data = await response.json();
			for (const [key, value] of Object.entries(data)) {
				if (typeof value?.mcap !== 'number') {
					continue;
				}
				const address = key.slice(slug.length + 1);
				marketCaps.set(address.toLowerCase(), Math.round(value.mcap));
			}
		} catch (error) {
			console.warn(`⚠ mcap fetch failed for chain ${chainID}: ${error.message}`);
		}
	}
	return marketCaps;
}

async function buildChainIndex(chainID, addedAtMap) {
	const addresses = listTokenAddresses(chainID);
	// Market caps depend only on addresses, so fetch them (DefiLlama) in parallel with the
	// token list (GitHub) — two different hosts, no added pressure on either.
	const [listMetadata, marketCaps] = await Promise.all([
		fetchTokenListMetadata(chainID),
		fetchMarketCaps(chainID, addresses)
	]);

	const missing = addresses.filter(address => address.startsWith('0x') && !listMetadata.has(address.toLowerCase()));
	const onchainMetadata = await fetchOnchainMetadata(chainID, missing);

	const tokens = addresses.map(address => {
		const metadata =
			listMetadata.get(address.toLowerCase()) ||
			onchainMetadata.get(address.toLowerCase()) ||
			readLocalInfo(chainID, address);
		return {
			address: toDisplayAddress(address),
			// Clamp name/symbol coming from remote tokenlists / on-chain reads, mirroring the
			// submit-form limits, so a hostile or malformed source can't bloat the shipped index.
			name: clampString(metadata?.name, 60),
			symbol: clampString(metadata?.symbol, 20),
			decimals: normalizeDecimals(metadata?.decimals),
			addedAt: addedAtMap.get(`${chainID}/${address}`),
			mcap: marketCaps.get(address.toLowerCase())
		};
	});

	tokens.sort((first, second) => {
		if (!!first.symbol !== !!second.symbol) {
			if (first.symbol) {
				return -1;
			}
			return 1;
		}
		return (first.symbol || first.address).localeCompare(second.symbol || second.address);
	});

	const enrichedCount = tokens.filter(token => token.symbol || token.name).length;
	console.log(
		`✔ chain ${chainID}: ${tokens.length} tokens (${enrichedCount} enriched, ${listMetadata.size} from tokenlist, ${onchainMetadata.size} onchain, ${marketCaps.size} with mcap)`
	);
	return tokens;
}

async function main() {
	if (
		process.argv.includes('--if-missing') &&
		fs.existsSync(path.join(OUT_DIR, 'chains.json')) &&
		fs.existsSync(path.join(OUT_DIR, 'allChains.json'))
	) {
		console.log('✔ index already generated, skipping (remove public/data to regenerate)');
		return;
	}

	fs.mkdirSync(path.join(OUT_DIR, 'tokens'), {recursive: true});

	const addedAtMap = buildAddedAtMap();
	console.log(`✔ resolved added-at dates for ${addedAtMap.size} tokens from git history`);

	const chainIDs = listChainDirectories();
	const chains = [];
	const popularityByID = new Map();
	const searchIndex = [];

	for (const chainID of chainIDs) {
		const tokens = await buildChainIndex(chainID, addedAtMap);
		if (tokens.length === 0) {
			continue;
		}
		const name = CHAIN_NAMES[chainID] || getViemChain(chainID)?.name || `Chain ${chainID}`;
		const explorer = getViemChain(chainID)?.blockExplorers?.default?.url;
		chains.push({id: chainID, name, slug: toSlug(name), count: tokens.length, explorer});
		popularityByID.set(
			chainID,
			tokens.reduce((sum, token) => sum + (token.mcap || 0), 0)
		);
		fs.writeFileSync(path.join(OUT_DIR, 'tokens', `${chainID}.json`), JSON.stringify(tokens));
		for (const token of tokens) {
			searchIndex.push({
				chainID,
				address: token.address,
				symbol: token.symbol,
				name: token.name,
				mcap: token.mcap
			});
		}
	}

	// Order chains by popularity (total market cap of their tokens), chain ID as tiebreak.
	chains.sort((first, second) => {
		const popularityDiff = (popularityByID.get(second.id) || 0) - (popularityByID.get(first.id) || 0);
		if (popularityDiff !== 0) {
			return popularityDiff;
		}
		return (Number(first.id) || Number.POSITIVE_INFINITY) - (Number(second.id) || Number.POSITIVE_INFINITY);
	});
	const totalTokens = chains.reduce((sum, chain) => sum + chain.count, 0);
	fs.writeFileSync(path.join(OUT_DIR, 'chains.json'), JSON.stringify({totalTokens, chains}, null, '\t'));
	fs.writeFileSync(path.join(OUT_DIR, 'search.json'), JSON.stringify(searchIndex));
	console.log(`✔ ${chains.length} chains, ${totalTokens} tokens, search index → public/data`);

	writeAllChains(new Set(chains.map(chain => chain.id)));
}

// The superset of EVM mainnets, so the "add a network" flow can surface chains not yet on the CDN.
// Each entry carries the native-currency metadata used to pre-fill the native-token folder. Testnets
// and local/dev chains (Anvil, Hardhat, …) are excluded as noise, and the `onCDN` flag lets the
// picker split "on the CDN" from "not yet".
function isLocalChain(chain) {
	const rpc = chain.rpcUrls?.default?.http?.[0] || '';
	return /localhost|127\.0\.0\.1/.test(rpc);
}

function writeAllChains(onCDNChainIDs) {
	const seen = new Set();
	const allChains = [];
	for (const chain of Object.values(viemChains)) {
		if (!chain?.id || !chain.name || !chain.nativeCurrency || chain.testnet || isLocalChain(chain)) {
			continue;
		}
		const id = String(chain.id);
		if (seen.has(id)) {
			continue;
		}
		seen.add(id);
		allChains.push({
			id,
			name: chain.name,
			nativeName: chain.nativeCurrency.name,
			nativeSymbol: chain.nativeCurrency.symbol,
			nativeDecimals: chain.nativeCurrency.decimals,
			onCDN: onCDNChainIDs.has(id)
		});
	}
	allChains.sort((first, second) => first.name.localeCompare(second.name));
	fs.writeFileSync(path.join(OUT_DIR, 'allChains.json'), JSON.stringify(allChains));
	console.log(
		`✔ ${allChains.length} mainnet chains (${allChains.filter(c => !c.onCDN).length} off-CDN) → allChains.json`
	);
}

await main();
