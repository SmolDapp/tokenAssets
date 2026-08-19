// Composes third-party SVGs into a single 32×32 logo.
//
// Sources are arbitrary files pulled from the CDN or dropped by the user, so two hazards have to be
// neutralised before two of them can share one document. Both were measured against the CDN's own
// logos rather than assumed:
//
//  - Names collide. 365 of 600 Ethereum logos carry an `id` (Figma's `clip0_…`, `paint0_linear_…`)
//    and 28 carry a <style> block full of generic `.cls-1` / `.st0`. Merged as-is, the second
//    fragment's clip paths, gradients and stylesheet silently repaint the first. Every id and class
//    is therefore rewritten with a per-slot prefix, references included.
//  - User spaces differ. Only about a quarter are `viewBox="0 0 32 32"`; 152 of 600 declare no
//    viewBox at all (just `width="250"`), and some use a non-zero origin. Placement goes through
//    each source's own box instead of a fixed scale.
//
// Parsing is DOM-based, never regex: these are hostile-shaped documents and an attribute-level
// rewrite has to know what is markup and what is text.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// Every logo in the CDN is authored on a 32-unit canvas, and the submit API rasterizes from the
// declared size — so the composed root always declares exactly that.
export const CANVAS_SIZE = 32;

// The attributes whose value may be a bare `#localID`. Confining the bare-hash rewrite to these
// keeps it away from `fill="#fff"`, which would otherwise be mangled by a source that happens to
// name an element `id="fff"`.
const HREF_ATTRIBUTES = new Set(['href', 'xlink:href']);

export type TSvgViewBox = {minX: number; minY: number; width: number; height: number};
// `inkRatio` and `edgeColor` are attached by the caller, not by parseSvgFragment: measuring them
// needs a canvas and is async, while parsing stays pure and synchronous. Absent inkRatio means
// "unmeasured, place at full size"; absent edgeColor means the logo brings no background of its own.
export type TSvgFragment = {content: string; viewBox: TSvgViewBox; inkRatio?: number; edgeColor?: string};
export type TPlacementBox = {x: number; y: number; size: number};

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Trailing `(?![\w-])` so `.cls-1` does not also match the `.cls-10` next to it.
function selectorPattern(selector: string): RegExp {
	return new RegExp(`${escapeRegExp(selector)}(?![\\w-])`, 'g');
}

function round(value: number, digits: number): number {
	return Number(value.toFixed(digits));
}

// Tolerates a unit suffix (`250px`) but rejects a percentage, which is relative to a viewport this
// fragment no longer has once it is transplanted.
function parseLength(raw: string | null): number | null {
	if (!raw || raw.trim().endsWith('%')) {
		return null;
	}
	const value = Number.parseFloat(raw);
	if (!Number.isFinite(value) || value <= 0) {
		return null;
	}
	return value;
}

function readViewBox(root: Element): TSvgViewBox | null {
	const raw = root.getAttribute('viewBox');
	if (raw) {
		const parts = raw
			.trim()
			.split(/[\s,]+/)
			.map(Number);
		if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
			return {minX: parts[0], minY: parts[1], width: parts[2], height: parts[3]};
		}
	}
	const width = parseLength(root.getAttribute('width'));
	const height = parseLength(root.getAttribute('height'));
	if (width && height) {
		return {minX: 0, minY: 0, width, height};
	}
	return null;
}

function rewriteURLReferences(value: string, ids: Set<string>, prefix: string): string {
	return value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match, quote: string, name: string) => {
		if (!ids.has(name)) {
			return match;
		}
		return `url(${quote}#${prefix}${name}${quote})`;
	});
}

// `<style>` holds selectors, which the attribute pass cannot see. Only names actually declared in
// this fragment are rewritten, so an unrelated `#fff` in a colour stop is left alone.
function rewriteStyleSheet(css: string, ids: Set<string>, classes: Set<string>, prefix: string): string {
	let next = rewriteURLReferences(css, ids, prefix);
	for (const name of classes) {
		next = next.replace(selectorPattern(`.${name}`), `.${prefix}${name}`);
	}
	for (const name of ids) {
		next = next.replace(selectorPattern(`#${name}`), `#${prefix}${name}`);
	}
	return next;
}

function namespaceElements(elements: Element[], prefix: string): void {
	const ids = new Set<string>();
	const classes = new Set<string>();
	for (const element of elements) {
		const id = element.getAttribute('id');
		if (id) {
			ids.add(id);
		}
		const className = element.getAttribute('class');
		if (className) {
			for (const token of className.trim().split(/\s+/)) {
				classes.add(token);
			}
		}
	}
	if (ids.size === 0 && classes.size === 0) {
		return;
	}

	for (const element of elements) {
		// Attr.value is assigned directly: setAttribute() with a qualified name like `xlink:href`
		// creates a namespace-less attribute in an XML document, which drops the reference.
		for (const attribute of Array.from(element.attributes)) {
			if (attribute.name === 'id') {
				attribute.value = `${prefix}${attribute.value}`;
				continue;
			}
			if (attribute.name === 'class') {
				attribute.value = attribute.value
					.trim()
					.split(/\s+/)
					.map(token => `${prefix}${token}`)
					.join(' ');
				continue;
			}
			let next = rewriteURLReferences(attribute.value, ids, prefix);
			if (HREF_ATTRIBUTES.has(attribute.name) && next.startsWith('#') && ids.has(next.slice(1))) {
				next = `#${prefix}${next.slice(1)}`;
			}
			attribute.value = next;
		}
	}

	for (const element of elements) {
		if (element.localName === 'style') {
			element.textContent = rewriteStyleSheet(element.textContent || '', ids, classes, prefix);
		}
	}
}

// Returns null when the input is not usable as a logo layer: unparseable, not an <svg>, or carrying
// no dimensions to scale from.
export function parseSvgFragment(svgText: string, prefix: string): TSvgFragment | null {
	const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
	if (parsed.getElementsByTagName('parsererror').length > 0) {
		return null;
	}
	const root = parsed.documentElement;
	if (root?.localName !== 'svg') {
		return null;
	}
	const viewBox = readViewBox(root);
	if (!viewBox) {
		return null;
	}

	namespaceElements(Array.from(root.querySelectorAll('*')), prefix);

	// The children are moved into one group before serializing: serializing them individually makes
	// XMLSerializer repeat `xmlns` on each, since it cannot see the root they came from.
	const group = parsed.createElementNS(SVG_NS, 'g');
	while (root.firstChild) {
		group.appendChild(root.firstChild);
	}
	return {content: new XMLSerializer().serializeToString(group), viewBox};
}

// Fits the fragment into `box` preserving its aspect ratio and centring the remainder — the same
// result as `preserveAspectRatio="xMidYMid meet"`, which a transplanted fragment no longer gets.
export function placeFragment(fragment: TSvgFragment, box: TPlacementBox): string {
	const {minX, minY, width, height} = fragment.viewBox;
	const scale = box.size / Math.max(width, height);
	const x = box.x + (box.size - width * scale) / 2 - minX * scale;
	const y = box.y + (box.size - height * scale) / 2 - minY * scale;
	return `<g transform="translate(${round(x, 4)} ${round(y, 4)}) scale(${round(scale, 6)})">${fragment.content}</g>`;
}

// `xmlns:xlink` is declared unconditionally and is NOT redundant: a source using `xlink:href`
// declares that prefix on its own <svg> root, which compositing discards. Without it here, resvg
// fails the whole document with "unknown namespace prefix 'xlink'" — a parse error, not a warning,
// so the submit route would reject a logo that looks fine in the browser.
export function composeRoot(layers: string[]): string {
	const open = `<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" fill="none">`;
	return `${open}${layers.join('')}</svg>`;
}
