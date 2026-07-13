import {Resvg} from '@resvg/resvg-js';

// Server-only (Node runtime): resvg is a native package. Shared by the token and network submit
// routes so the CDN's PNG rendering and the square-shape guard have a single source of truth.

export function renderPngBase64(svg: string, size: number): string {
	const resvg = new Resvg(svg, {fitTo: {mode: 'width', value: size}});
	return Buffer.from(resvg.render().asPng()).toString('base64');
}

// A logo must be roughly square. Rejecting extreme aspect ratios also bounds the rasterized height:
// fitTo width caps width, and a bounded ratio then caps height — so no crafted SVG can request a
// giant pixmap that OOMs the function, and we never ship a wrong-shaped CDN artifact.
export function isSquareEnough(svg: string): boolean {
	const {width, height} = new Resvg(svg);
	if (!width || !height) {
		return false;
	}
	const ratio = width / height;
	return ratio >= 0.5 && ratio <= 2;
}
