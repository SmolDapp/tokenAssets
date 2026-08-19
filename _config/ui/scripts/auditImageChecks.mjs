// The per-token image checks. Kept apart from the orchestration in auditImages.mjs because these
// run inside a short-lived child process — see auditImagesWorker.mjs for why that isolation is not
// optional.
//
// The repo's CI (.github/scripts/verify-tokens.mjs) checks that logo.svg, logo-32.png and
// logo-128.png exist. It never opens them. Two defects hide in that gap, both measured on the real
// corpus before this was written:
//
//  - PNGs that are not the size their name promises: 85 logo-32.png and 91 logo-128.png are off,
//    including ten stored at 256x256 and 1024x1024 — raw exports dropped in without resizing.
//  - PNGs that do not depict the SVG beside them: about 2.5% of a 200-token sample.
//
// On that second one the report stays descriptive. The reference case is LBTC
// (tokens/1/0x8236a87084f8b84306f72007f36f2618a5634494): resvg renders its logo.svg almost white
// because the file leans on `<mask style="mask-type:alpha">`, while the stored PNG carries the real
// dark artwork. A browser and resvg disagree, so naming either side "wrong" would be a guess. What
// is certain, and worth reporting, is that consumers do not all see the same logo.

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';

// Both images are composited onto white before comparing: most logos are transparent outside their
// disc, and letting alpha into the difference would swamp the colours that actually matter.
const COMPARE_SIZE = 32;
// Mean absolute difference per colour channel, 0-255. Calibrated on a 200-token sample: the bulk of
// honest pairs sit under 6, which is antialiasing between two rasterizers. 25 is where the two files
// stop showing the same thing — LBTC measures 102.
const DRIFT_THRESHOLD = 6;
const MISMATCH_THRESHOLD = 25;

const EXPECTED_SIZES = [
	{file: 'logo-32.png', size: 32},
	{file: 'logo-128.png', size: 128}
];

async function toComparableRaw(buffer) {
	return sharp(buffer).ensureAlpha().resize(COMPARE_SIZE, COMPARE_SIZE, {fit: 'fill'}).raw().toBuffer();
}

function meanAbsoluteDifference(first, second) {
	let total = 0;
	for (let index = 0; index < first.length; index += 4) {
		const firstAlpha = first[index + 3];
		const secondAlpha = second[index + 3];
		for (let channel = 0; channel < 3; channel++) {
			const onWhiteFirst = (first[index + channel] * firstAlpha + 255 * (255 - firstAlpha)) / 255;
			const onWhiteSecond = (second[index + channel] * secondAlpha + 255 * (255 - secondAlpha)) / 255;
			total += Math.abs(onWhiteFirst - onWhiteSecond);
		}
	}
	return total / ((first.length / 4) * 3);
}

async function checkDimensions(token) {
	const findings = [];
	for (const expected of EXPECTED_SIZES) {
		let meta = null;
		try {
			meta = await sharp(readFileSync(path.join(token.directory, expected.file))).metadata();
		} catch {
			// A missing or unreadable PNG is already the CI's business; nothing to add here.
			continue;
		}
		if (meta.width !== expected.size || meta.height !== expected.size) {
			findings.push({
				check: 'png-dimensions',
				severity: 'medium',
				title: `${expected.file} is ${meta.width}x${meta.height}, not ${expected.size}x${expected.size}`,
				detail: 'Consumers size by filename, so an off-size file is scaled twice or overflows its slot.',
				entries: [token.entry]
			});
		}
	}
	return findings;
}

async function checkFidelity(token) {
	const svg = readFileSync(path.join(token.directory, 'logo.svg'), 'utf8');
	const rendered = new Resvg(svg, {fitTo: {mode: 'width', value: COMPARE_SIZE}}).render().asPng();
	const stored = readFileSync(path.join(token.directory, 'logo-32.png'));
	const difference = meanAbsoluteDifference(await toComparableRaw(rendered), await toComparableRaw(stored));

	if (difference >= MISMATCH_THRESHOLD) {
		return [
			{
				check: 'png-svg-mismatch',
				severity: 'high',
				title: 'logo.svg and logo-32.png do not show the same thing',
				detail: `Mean channel difference ${difference.toFixed(
					1
				)} of 255. Which file is right needs a human: a strict renderer and a browser can disagree on the same SVG.`,
				entries: [token.entry]
			}
		];
	}
	if (difference >= DRIFT_THRESHOLD) {
		return [
			{
				check: 'png-svg-drift',
				severity: 'low',
				title: 'logo.svg and logo-32.png differ more than antialiasing explains',
				detail: `Mean channel difference ${difference.toFixed(
					1
				)} of 255. Usually a PNG that was not regenerated after the SVG changed.`,
				entries: [token.entry]
			}
		];
	}
	return [];
}

// The two phases are exposed separately, and the worker records the first before attempting the
// second. Reading the PNG headers cannot bring the process down; rendering the SVG can. Running them
// as one unit meant a token that crashes the rasterizer also lost its dimension result, which is how
// the first full pass came back ten findings short of the count taken by hand.
export async function auditTokenDimensions(token) {
	return checkDimensions(token);
}

export async function auditTokenFidelity(token) {
	try {
		return await checkFidelity(token);
	} catch (error) {
		return [
			{
				check: 'svg-unrenderable',
				severity: 'high',
				title: 'logo.svg could not be rendered',
				detail: String(error.message || error),
				entries: [token.entry]
			}
		];
	}
}
