// Cross-entry audit of the token corpus.
//
// The repo's CI validates each token folder on its own. This looks at the corpus as a whole, where a
// different class of defect lives: two unrelated tokens wearing the same logo, one token whose logo
// changes from chain to chain, an image set that disagrees with itself.
//
// Advisory only. Nothing here fails a build, and it should not: 449 of the 598 groups that share a
// logo are the same token deployed on several chains, which is correct. The heuristics below exist
// to separate that legitimate majority from the handful that are real, and they were each tuned
// against the actual corpus rather than guessed.
//
// Usage:
//   node scripts/auditTokens.mjs                 full pass, about 5 minutes
//   node scripts/auditTokens.mjs --skip-pixels   families 1, 2 and 4 only, a few seconds

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditImages} from './auditImages.mjs';
import {areSymbolsRelated, normalizeSymbol} from './auditSymbols.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..', '..', '..');
const TOKENS_DIR = path.join(ROOT_DIR, 'tokens');
const DATA_DIR = path.resolve(SCRIPT_DIR, '..', 'public', 'data');
const OUT_FILE = path.join(DATA_DIR, 'audit.json');
const SEARCH_FILE = path.join(DATA_DIR, 'search.json');

// The native-token placeholders. Every chain points its own coin at one of these, so ETH, BNB, POL
// and TRX legitimately share an address and legitimately differ in logo. Measured: excluding these
// removes exactly one false finding, but it is the loudest one.
const SENTINEL_PATTERNS = [/^0x0+$/, /^0xe{4,}/i, /^0x0{10,}/];

const SEVERITY_RANK = {high: 0, medium: 1, low: 2};

function isSentinelAddress(address) {
	return SENTINEL_PATTERNS.some(pattern => pattern.test(address));
}

function readJSON(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch {
		return null;
	}
}

function loadMarketCaps() {
	const entries = readJSON(SEARCH_FILE);
	const byKey = new Map();
	if (!Array.isArray(entries)) {
		return byKey;
	}
	for (const entry of entries) {
		byKey.set(`${entry.chainID}/${entry.address.toLowerCase()}`, entry.mcap || 0);
	}
	return byKey;
}

function collectTokens() {
	const marketCaps = loadMarketCaps();
	const tokens = [];
	for (const chainID of fs.readdirSync(TOKENS_DIR)) {
		const chainDir = path.join(TOKENS_DIR, chainID);
		if (chainID.startsWith('_') || chainID.startsWith('.') || !fs.statSync(chainDir).isDirectory()) {
			continue;
		}
		for (const address of fs.readdirSync(chainDir)) {
			const directory = path.join(chainDir, address);
			if (address.startsWith('_') || address.startsWith('.') || !fs.statSync(directory).isDirectory()) {
				continue;
			}
			const logoFile = path.join(directory, 'logo.svg');
			let logoHash = null;
			if (fs.existsSync(logoFile)) {
				logoHash = createHash('sha1').update(fs.readFileSync(logoFile)).digest('hex');
			}
			const info = readJSON(path.join(directory, 'info.json'));
			tokens.push({
				directory,
				logoHash,
				hasInfo: info !== null,
				info: info || {},
				entry: {
					chainID,
					address,
					symbol: info?.symbol || null,
					name: info?.name || null,
					mcap: marketCaps.get(`${chainID}/${address.toLowerCase()}`) || 0
				}
			});
		}
	}
	return tokens;
}

function groupBy(items, toKey) {
	const groups = new Map();
	for (const item of items) {
		const key = toKey(item);
		if (key === null || key === undefined) {
			continue;
		}
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key).push(item);
	}
	return groups;
}

// Some tickers do not name a token at all: they name a family of markets, each with its own
// artwork. Such a ticker says nothing about what a token is, so both families ignore it.
//
// The test is absolute, not a ratio. A ratio alone called EURT generic on the strength of two
// entries with two logos, which killed the USDT/EURT finding this whole file exists to surface, and
// it also swallowed ezETH, weETH and rETH — the very inconsistencies family 2 is meant to report.
//
// Sorting the corpus by distinct logo count leaves an unmistakable gap: PENDLE-LPT has 35, and the
// next ticker down has 8. Any threshold inside that gap selects exactly the one real case.
const GENERIC_MIN_LOGOS = 10;

function findGenericSymbols(tokens) {
	const generic = new Set();
	for (const [symbol, group] of groupBy(tokens, token => {
		if (!token.entry.symbol) {
			return null;
		}
		return token.entry.symbol.toLowerCase();
	})) {
		const logoCount = new Set(group.map(token => token.logoHash)).size;
		if (logoCount >= GENERIC_MIN_LOGOS && logoCount > group.length / 2) {
			generic.add(symbol);
		}
	}
	return generic;
}

// Family 1 — one logo worn by tokens that are not the same thing.
function auditSharedLogos(tokens, genericSymbols) {
	const findings = [];
	for (const group of groupBy(tokens, token => token.logoHash).values()) {
		if (group.length < 2) {
			continue;
		}
		const cores = [
			...new Set(
				group
					.map(token => token.entry.symbol)
					.filter(symbol => Boolean(symbol) && !genericSymbols.has(symbol.toLowerCase()))
					.map(normalizeSymbol)
			)
		];
		if (cores.length < 2) {
			continue;
		}
		const unrelated = cores.some(core => cores.some(other => !areSymbolsRelated(core, other)));
		if (!unrelated) {
			continue;
		}
		const symbols = [...new Set(group.map(token => token.entry.symbol).filter(Boolean))];
		findings.push({
			family: 'shared-logo',
			check: 'same-logo-unrelated-symbols',
			severity: 'high',
			title: `One logo shared by unrelated tokens: ${symbols.slice(0, 6).join(', ')}`,
			detail: `${group.length} tokens carry a byte-identical logo.svg, but their tickers do not reduce to the same asset.`,
			entries: group.map(token => token.entry)
		});
	}
	return findings;
}

// Family 2 — one token drawn differently depending on where you look.
function auditDivergentLogos(tokens, genericSymbols) {
	const findings = [];

	for (const [address, group] of groupBy(tokens, token => token.entry.address.toLowerCase())) {
		if (group.length < 2 || isSentinelAddress(address)) {
			continue;
		}
		if (new Set(group.map(token => token.logoHash)).size < 2) {
			continue;
		}
		const symbols = [...new Set(group.map(token => token.entry.symbol).filter(Boolean))];
		findings.push({
			family: 'divergent-logo',
			check: 'same-address-different-logo',
			severity: 'high',
			title: `Same address on ${group.length} chains, ${
				new Set(group.map(t => t.logoHash)).size
			} different logos${symbols.length > 0 ? ` (${symbols.slice(0, 3).join(', ')})` : ''}`,
			detail: 'A deterministic deployment puts the same token at the same address on every chain, so the artwork should not change with the chain.',
			entries: group.map(token => token.entry)
		});
	}

	for (const [symbol, group] of groupBy(tokens, token => {
		if (!token.entry.symbol) {
			return null;
		}
		return token.entry.symbol.toLowerCase();
	})) {
		if (group.length < 2) {
			continue;
		}
		const logoCount = new Set(group.map(token => token.logoHash)).size;
		if (logoCount < 2 || genericSymbols.has(symbol)) {
			continue;
		}
		// The loudest check by volume, and deliberately so: nearly 300 tickers are drawn more than one
		// way. Most are real questions rather than noise — ETH is "Ether", "Ethereum" and "Ethereum
		// Token" across three logos. Filtering on name agreement was tried and rejected: it removed
		// USDC, USDT and ETH, which are the findings that matter most. The list is ranked by market
		// cap instead, so the ones worth acting on sit at the top.
		findings.push({
			family: 'divergent-logo',
			check: 'same-symbol-different-logo',
			severity: 'medium',
			title: `${symbol.toUpperCase()} is drawn ${logoCount} different ways across ${group.length} entries`,
			detail: 'Same ticker, different artwork. Either one of them is stale, or the ticker is shared by genuinely different assets.',
			entries: group.map(token => token.entry)
		});
	}

	return findings;
}

// Family 4 — metadata that is legal for the CI but still wrong or missing.
function auditMetadata(tokens, genericSymbols) {
	const findings = [];

	for (const token of tokens) {
		if (!token.hasInfo) {
			findings.push({
				family: 'metadata',
				check: 'missing-info',
				severity: 'medium',
				title: 'No info.json',
				detail: 'The CI treats info.json as optional, so this passes. The token is invisible to search and has no name, symbol or decimals.',
				entries: [token.entry]
			});
			continue;
		}
		if (Number.isInteger(token.info.decimals) && token.info.decimals > 36) {
			findings.push({
				family: 'metadata',
				check: 'implausible-decimals',
				severity: 'low',
				title: `decimals is ${token.info.decimals}`,
				detail: 'No ERC-20 in use goes above 36. Likely a typo or a misread of the contract.',
				entries: [token.entry]
			});
		}
	}

	for (const [key, group] of groupBy(tokens, token => {
		if (!token.entry.symbol) {
			return null;
		}
		return `${token.entry.chainID}/${token.entry.symbol.toLowerCase()}`;
	})) {
		// A market-family ticker is shared by design — 28 Pendle LP tokens on chain 1 alone — so it
		// says nothing about impersonation.
		if (group.length < 2 || genericSymbols.has(key.split('/')[1])) {
			continue;
		}
		findings.push({
			family: 'metadata',
			check: 'duplicate-symbol-on-chain',
			severity: 'medium',
			title: `${group.length} addresses share the ticker ${key.split('/')[1].toUpperCase()} on chain ${
				key.split('/')[0]
			}`,
			detail: 'One chain, one ticker, several contracts. Worth checking that none of them is impersonating the others.',
			entries: group.map(token => token.entry)
		});
	}

	return findings;
}

function peakMarketCap(finding) {
	return Math.max(...finding.entries.map(entry => entry.mcap || 0), 0);
}

function sortFindings(findings) {
	return findings.sort((first, second) => {
		const bySeverity = SEVERITY_RANK[first.severity] - SEVERITY_RANK[second.severity];
		if (bySeverity !== 0) {
			return bySeverity;
		}
		return peakMarketCap(second) - peakMarketCap(first);
	});
}

function countBy(findings, toKey) {
	const counts = {};
	for (const finding of findings) {
		counts[toKey(finding)] = (counts[toKey(finding)] || 0) + 1;
	}
	return counts;
}

async function main() {
	const skipPixels = process.argv.includes('--skip-pixels');
	const tokens = collectTokens();
	console.log(`Auditing ${tokens.length} tokens…`);

	const genericSymbols = findGenericSymbols(tokens);
	const findings = [
		...auditSharedLogos(tokens, genericSymbols),
		...auditDivergentLogos(tokens, genericSymbols),
		...auditMetadata(tokens, genericSymbols)
	];

	if (skipPixels) {
		console.log('Skipping the image pass (--skip-pixels).');
	} else {
		console.log('Comparing every logo.svg against its PNGs, this is the slow part…');
		const imageFindings = await auditImages(tokens, (done, total) => console.log(`  ${done}/${total}`));
		for (const finding of imageFindings) {
			findings.push({...finding, family: 'image-integrity'});
		}
	}

	sortFindings(findings);
	const report = {
		// Computed from the files in this checkout. The /audit page shows logos from the CDN, which
		// mirrors main — on a working branch the two can disagree, hence the timestamp on the page.
		generatedAt: new Date().toISOString(),
		tokenCount: tokens.length,
		skippedPixels: skipPixels,
		totals: {byFamily: countBy(findings, f => f.family), byCheck: countBy(findings, f => f.check)},
		findings
	};

	// Minified, like the other generated payloads in this directory. Only the small chains.json is
	// indented; this one runs past half a megabyte.
	fs.mkdirSync(DATA_DIR, {recursive: true});
	fs.writeFileSync(OUT_FILE, JSON.stringify(report));

	console.log(`\n${findings.length} findings -> ${path.relative(ROOT_DIR, OUT_FILE)}`);
	for (const [check, count] of Object.entries(report.totals.byCheck).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${String(count).padStart(5)}  ${check}`);
	}
}

main();
