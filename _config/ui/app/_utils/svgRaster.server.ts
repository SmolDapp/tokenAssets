import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';

// Server-only (Node runtime): resvg is a native package. Shared by the token and network submit
// routes so the CDN's PNG rendering and the square-shape guard have a single source of truth.

// resvg defaults to `loadSystemFonts: true`, and the serverless runtime has no fonts — a
// `font-family="Arial"` then resolves to nothing and resvg drops the glyphs *silently*, which is how
// a logo whose `<text>` renders fine in the browser preview shipped as a blank PNG. Pinning our own
// files makes the output identical everywhere. Liberation Sans is metric-compatible with
// Arial/Helvetica, and every generic family maps to it so an unknown font degrades to a substitution
// instead of to nothing.
const FONT_DIRECTORY = path.join(process.cwd(), 'app/_assets/fonts');
const FONT_OPTIONS = {
	loadSystemFonts: false,
	fontFiles: [
		path.join(FONT_DIRECTORY, 'LiberationSans-Regular.ttf'),
		path.join(FONT_DIRECTORY, 'LiberationSans-Bold.ttf')
	],
	defaultFontFamily: 'Liberation Sans',
	sansSerifFamily: 'Liberation Sans',
	serifFamily: 'Liberation Sans',
	monospaceFamily: 'Liberation Sans',
	cursiveFamily: 'Liberation Sans',
	fantasyFamily: 'Liberation Sans'
};

const TEXT_ELEMENT_PATTERN = /<(text|tspan)[\s>]/i;
// Bounded quantifiers (vs `*`) keep the scan linear, the same reason forbidden-svg-pattern.mjs bounds
// its `data:` arm: an unbounded version backtracks quadratically on a 150KB logo made of `<title `
// repetitions with no closing tag — measured 4.2s of CPU for a single request, against 29ms bounded.
// An accessible name longer than the content bound simply is not restored, as before this existed.
const TITLE_PATTERN = /<title(?:\s[^>]{0,256})?>[\s\S]{0,512}?<\/title>/i;
const DESC_PATTERN = /<desc(?:\s[^>]{0,256})?>[\s\S]{0,512}?<\/desc>/i;
const OPEN_SVG_TAG_PATTERN = /<svg[^>]*>/i;

// usvg keeps gradients, filters and opacity but discards `<title>` and `<desc>` — the accessible name
// a screen reader announces for the logo. They carry no geometry, so lifting the source's first of
// each back onto the outlined root restores the description without touching what is drawn.
function restoreAccessibleText(source: string, outlined: string): string {
	const metadata = [TITLE_PATTERN, DESC_PATTERN].map(pattern => source.match(pattern)?.[0] ?? '').join('');
	if (!metadata) {
		return outlined;
	}
	// Replacing via a callback so a `$&` inside the author's title is inserted literally.
	return outlined.replace(OPEN_SVG_TAG_PATTERN, openTag => `${openTag}${metadata}`);
}

// Replaces `<text>` with the glyph outlines, so the logo.svg we commit no longer depends on a font
// being installed wherever it is later rendered — wallets, aggregators and our own PNGs all get the
// same shapes. usvg does the outlining while parsing; `toString()` serializes that processed tree.
//
// Only SVGs that actually contain text go through it: `toString()` rewrites the whole document
// (rects become paths, `<defs>` is restructured, unsupported features are dropped), and a submission
// we have nothing to fix should be committed as its author wrote it.
//
// Callers must re-run `isForbiddenSvg` on the result: usvg re-encodes embedded data URIs, so a
// percent-encoded one that passed the input check comes back as base64 and would trip the CI grep.
export function outlineSvgText(svg: string): string {
	if (!TEXT_ELEMENT_PATTERN.test(svg)) {
		return svg;
	}
	const outlined = new Resvg(svg, {font: FONT_OPTIONS}).toString();
	return `${restoreAccessibleText(svg, outlined).trim()}\n`;
}

export function renderPngBase64(svg: string, size: number): string {
	const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: size}, font: FONT_OPTIONS});
	return Buffer.from(resvg.render().asPng()).toString('base64');
}

// A logo must be roughly square. Rejecting extreme aspect ratios also bounds the rasterized height:
// fitTo width caps width, and a bounded ratio then caps height — so no crafted SVG can request a
// giant pixmap that OOMs the function, and we never ship a wrong-shaped CDN artifact.
//
// Passing the fonts is not about text here — it is `loadSystemFonts: false` that matters. The default
// scans the host's font book on every construction, which measured ~150ms against ~0.5ms pinned.
export function isSquareEnough(svg: string): boolean {
	const {width, height} = new Resvg(svg, {font: FONT_OPTIONS});
	if (!width || !height) {
		return false;
	}
	const ratio = width / height;
	return ratio >= 0.5 && ratio <= 2;
}
