// Measures how far a logo's ink actually reaches from its centre, as a multiple of the half-side of
// the square it gets fitted into. 1.0 is a disc that exactly fills its viewBox; √2 ≈ 1.414 is ink
// sitting in the corners.
//
// This exists because fitting is rectangular but the templates' holes are round: a 26-wide box has a
// half-side of 13, yet its corners are 13√2 ≈ 18.4 from the centre, well past a ring whose inner
// edge is at 14. A disc never notices; a logo with a diagonal limb crosses the ring.
//
// Canvas-based rather than geometric on purpose. Sampling path data with getPointAtLength() would
// miss stroke width, fill rules and clip paths; rasterizing sees exactly what will be painted.
// Measured across 300 CDN logos, the median ratio is 1.004 — the correction is a no-op for the
// large majority, which are discs.

import {parseSvgFragment} from '@utils/svgCompose';

const SAMPLE_SIZE = 96;
// Above the antialiasing fringe, below anything deliberately faint. Measured: at 16 a perfect disc
// reads 1.009 instead of 1.000 because the fringe counts as ink; at 64 it reads 1.004, while a
// genuinely corner-filling logo still reads 1.399 and 1inch still reads 1.194. Past ~128 real ink
// starts being dropped.
const ALPHA_THRESHOLD = 64;
// Whatever we cannot measure is left alone rather than guessed at.
const UNMEASURED: TInkMeasurement = {ratio: 1, edgeColor: null};

// A logo only has a usable backing colour if it is a disc: past this it is a shape with corners, and
// whatever sits at its outer edge is not a background.
const ROUND_ENOUGH = 1.05;
// Sampled between these fractions of the ink radius: inside the antialiased rim, and tight enough to
// the edge that a glyph rarely reaches it.
const EDGE_INNER = 0.88;
const EDGE_OUTER = 0.98;
// The rim is taken as the DOMINANT colour, not a unanimous one. Requiring near-total agreement over a
// wider band refused 41% of perfectly round logos, because a large glyph — a wordmark, a big letter —
// reaches into the ring and breaks unanimity without being the background. A clear majority answers
// the real question: is there one flat colour out here, or is this a gradient?
const EDGE_MAJORITY = 0.55;
const EDGE_BUCKET = 16;
const EDGE_OPAQUE = 200;

export type TInkMeasurement = {
	ratio: number;
	// The logo's own background, when it has one: a flat, opaque rim on a round logo. Templates paint
	// their backing disc in it instead of white, so a coloured token reads as one continuous disc
	// rather than a token sitting on a white coaster.
	edgeColor: string | null;
};

function toHex(value: number): string {
	return Math.round(value).toString(16).padStart(2, '0');
}

// Buckets the ring's opaque pixels by colour, takes the most common bucket, and averages only that
// bucket's members — so the answer is the exact colour rather than the bucket's centre. Null when no
// bucket carries a majority, which is what a gradient or a patterned edge looks like.
function readEdgeColor(data: Uint8ClampedArray, size: number, radius: number): string | null {
	const half = size / 2;
	const inner = radius * EDGE_INNER;
	const outer = radius * EDGE_OUTER;
	const buckets = new Map<number, {count: number; red: number; green: number; blue: number}>();
	let total = 0;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const dx = x + 0.5 - half;
			const dy = y + 0.5 - half;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < inner || distance > outer) {
				continue;
			}
			const index = (y * size + x) * 4;
			if (data[index + 3] < EDGE_OPAQUE) {
				continue;
			}
			const red = data[index];
			const green = data[index + 1];
			const blue = data[index + 2];
			const key =
				Math.floor(red / EDGE_BUCKET) * 4096 +
				Math.floor(green / EDGE_BUCKET) * 64 +
				Math.floor(blue / EDGE_BUCKET);
			const bucket = buckets.get(key) || {count: 0, red: 0, green: 0, blue: 0};
			bucket.count++;
			bucket.red += red;
			bucket.green += green;
			bucket.blue += blue;
			buckets.set(key, bucket);
			total++;
		}
	}
	if (total < 32) {
		return null;
	}
	let winner = {count: 0, red: 0, green: 0, blue: 0};
	for (const bucket of buckets.values()) {
		if (bucket.count > winner.count) {
			winner = bucket;
		}
	}
	if (winner.count / total < EDGE_MAJORITY) {
		return null;
	}
	return `#${toHex(winner.red / winner.count)}${toHex(winner.green / winner.count)}${toHex(
		winner.blue / winner.count
	)}`;
}

export async function measureInk(svgText: string): Promise<TInkMeasurement> {
	// Routed through parseSvgFragment so the box read here is byte-for-byte the one placeFragment
	// will letterbox into — a second viewBox reader could drift and silently mis-measure.
	const fragment = parseSvgFragment(svgText, 'measure-');
	if (!fragment) {
		return UNMEASURED;
	}

	const image = new Image();
	try {
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('rasterize failed'));
			image.src = `data:image/svg+xml,${encodeURIComponent(svgText)}`;
		});
	} catch {
		return UNMEASURED;
	}

	const canvas = document.createElement('canvas');
	canvas.width = SAMPLE_SIZE;
	canvas.height = SAMPLE_SIZE;
	const context = canvas.getContext('2d', {willReadFrequently: true});
	if (!context) {
		return UNMEASURED;
	}

	// The same letterboxing placeFragment applies, so the measurement describes the placement.
	const {width, height} = fragment.viewBox;
	const scale = SAMPLE_SIZE / Math.max(width, height);
	const drawnWidth = width * scale;
	const drawnHeight = height * scale;
	context.drawImage(image, (SAMPLE_SIZE - drawnWidth) / 2, (SAMPLE_SIZE - drawnHeight) / 2, drawnWidth, drawnHeight);

	const {data} = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
	const half = SAMPLE_SIZE / 2;
	let maxSquared = 0;
	for (let y = 0; y < SAMPLE_SIZE; y++) {
		for (let x = 0; x < SAMPLE_SIZE; x++) {
			if (data[(y * SAMPLE_SIZE + x) * 4 + 3] <= ALPHA_THRESHOLD) {
				continue;
			}
			const dx = x + 0.5 - half;
			const dy = y + 0.5 - half;
			const squared = dx * dx + dy * dy;
			if (squared > maxSquared) {
				maxSquared = squared;
			}
		}
	}
	if (maxSquared === 0) {
		return UNMEASURED;
	}
	const radius = Math.sqrt(maxSquared);
	const ratio = radius / half;
	let edgeColor: string | null = null;
	if (ratio <= ROUND_ENOUGH) {
		edgeColor = readEdgeColor(data, SAMPLE_SIZE, radius);
	}
	return {ratio, edgeColor};
}
