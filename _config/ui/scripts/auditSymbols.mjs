// Deciding whether two tickers name the same underlying asset.
//
// This is the hardest judgement in the audit and the one that decides how much of it is noise. The
// corpus has 598 groups of tokens sharing a byte-identical logo, and 449 of them are the same token
// deployed on several chains — correct, and worth nothing as a finding. What must survive is the
// handful where the tickers genuinely disagree: USDT sitting on the same artwork as EURT is a
// dollar logo on a euro stablecoin.
//
// Every rule below was added because the real corpus demanded it, and each is annotated with the
// case that forced it. Reading them as a whole: the function errs toward calling two tickers
// related, because a missed finding costs less than a report nobody trusts.

// Wrapper and vault prefixes, longest first so `yvvb` wins over `yv`. Stripping these is what lets
// vbUSDC, amUSDT and yvDAI collapse onto the token they wrap.
const WRAPPER_PREFIX = /^(yvvb|yv|ys|vb|am|st|a|c|w|x|y|s|r)/;
// Bridged and versioned tails: USDC.e, yvUSDC-A, yvVelo-…-f, yvDAI-1.
const VARIANT_SUFFIX = /[.\-_](e|a|f|\d+)$/;

// Only the tail rule needs to be tight. Two letters would relate usdt to eurt, which is the one pair
// this file exists to keep apart, so three is the floor.
const RELATED_SUFFIX = 3;
const RELATED_PREFIX = 5;

// Reduces a ticker to the thing it wraps. USDC.e, vbUSDC and USDC all land on "usdc"; USDT and EURT
// stay apart.
export function normalizeSymbol(symbol) {
	let core = symbol.toLowerCase();
	core = core.replace(VARIANT_SUFFIX, '');
	// Drops decoration the ticker carries rather than means: the star in S*USDT, the ₮ in USD₮.
	core = core.replace(/[^a-z0-9]/g, '');
	core = core.replace(WRAPPER_PREFIX, '');
	core = core.replace(/0$/, '');
	return core;
}

// The shared tail of two cores, which is where a ticker keeps its underlying asset: aEthUSDC and
// aLinUSDC reduce to ethusdc and linusdc, and the usdc they have in common is the whole point.
function commonSuffixLength(first, second) {
	let length = 0;
	while (
		length < first.length &&
		length < second.length &&
		first[first.length - 1 - length] === second[second.length - 1 - length]
	) {
		length++;
	}
	return length;
}

// Three ways two tickers can mean the same asset, all needed against the real corpus:
//
//  - containment: "dai" sits inside "ajnadai", so a Yearn Ajna vault beside a Yearn DAI vault is
//    not a finding;
//  - a shared tail: Aave writes a<Chain><Asset>, so the chain infix breaks containment while the
//    asset still matches. Without this rule the family fills up with aEthUSDC vs aLinUSDC;
//  - a shared head: yvCurve-Tricrypto and yvCurve-3Crypto-f name the same vault family from
//    opposite ends.
export function areSymbolsRelated(first, second) {
	if (!first || !second) {
		return true;
	}
	if (first.includes(second) || second.includes(first)) {
		return true;
	}
	if (commonSuffixLength(first, second) >= RELATED_SUFFIX) {
		return true;
	}
	return first.slice(0, RELATED_PREFIX) === second.slice(0, RELATED_PREFIX) && first.length >= RELATED_PREFIX;
}
