// The decoration conventions a protocol applies to a token logo it wraps, expressed as placements
// on the 32-unit canvas. Adding a convention is one entry in LOGO_TEMPLATES.
//
// Every geometry here is read off a reference export rather than invented, so a build lands on the
// same pixels a designer would have produced by hand. Two families:
//
//  - BADGE templates decorate a base with smaller icons pinned to fixed boxes. project / project-2 /
//    project-3 pin 1–3 icons into the bottom-right corner (r = 5 alone, r = 4 in a cluster so
//    several still fit). project-stack inverts the roles: the base is the PROJECT, and two icons sit
//    top-right and bottom-right at the cluster size.
//  - FRAMED templates wrap a single token in a protocol's own artwork, sized to the free hole the
//    artwork leaves. Those holes were measured by rendering each decoration without its white
//    backing: Aave 13.95, Yearn 8.06, Compound 14.05, and Iron Bank's own backing disc is 12.
//
//    The builder paints that backing, not the artwork, so it can take the token's own colour
//    instead of always being white.
//
//    The boxes are cross-checked against the CDN's own wrapped logos rather than the reference
//    exports, because the references draw MONOCHROME GLYPHS while the builder places FULL LOGOS, and
//    a glyph is naturally smaller than the disc it came from. Reading the glyph as the box put
//    Compound and Iron Bank at half size. The real logos measure: ib-USDC r = 12.00, cUNI r = 12.40,
//    yDAI r = 7.20 (a glyph, so r = 8 for a full logo is right).
//
// Slots carry their own label because the roles are not fixed across templates.

import {AAVE_DOTTED_RING, AAVE_SOLID_RING, COMPOUND_ARCS, IRONBANK_MARK, YEARN_ARROW} from '@utils/logoTemplateArt';
import {CANVAS_SIZE, composeRoot, placeFragment, type TPlacementBox, type TSvgFragment} from '@utils/svgCompose';

export type TLogoTemplateID =
	| 'project'
	| 'project-2'
	| 'project-3'
	| 'project-stack'
	| 'aave-wrapped'
	| 'aave-interest-bearing'
	| 'yearn'
	| 'compound'
	| 'iron-bank';

export type TLogoSlot = {label: string; box: TPlacementBox};

export type TBuildOptions = {
	// Lays a white disc behind the token, and pulls the token in far enough to sit on it. Off by
	// default: most token logos already carry their own disc, and doubling it up would only add bytes.
	hasBackground: boolean;
	// Manual shrink applied on top of the automatic fit, 1 = leave it alone. It only ever pulls the
	// logo in: the fit is already the largest size that clears the artwork, so going past it would put
	// the ink back over the frame.
	//
	// It exists because the fit lands the ink exactly ON the boundary. For a disc that reads as filling
	// the space; for a logo with points it reads as bumping into it, and only a human can call that.
	scale: number;
};

export type TLogoTemplate = {
	ID: TLogoTemplateID;
	label: string;
	baseLabel: string;
	// In paint order — a later slot overlaps the one before it.
	badgeSlots: TLogoSlot[];
	// False for templates that already paint their own white backing — Yearn, Compound and Iron Bank
	// all do — so the builder hides an option that could not change anything.
	supportsBackground: boolean;
	build: (base: TSvgFragment, badges: (TSvgFragment | null)[], options: TBuildOptions) => string;
};

const FULL_CANVAS: TPlacementBox = {x: 0, y: 0, size: CANVAS_SIZE};
const CANVAS_CENTRE = CANVAS_SIZE / 2;
const CANVAS_RADIUS = CANVAS_SIZE / 2;

const ONE_BADGE: TLogoSlot[] = [{label: 'Project icon', box: {x: 20, y: 21, size: 10}}];
const TWO_BADGES: TLogoSlot[] = [
	{label: 'Project icon 1', box: {x: 19, y: 23, size: 8}},
	{label: 'Project icon 2', box: {x: 23, y: 23, size: 8}}
];
const THREE_BADGES: TLogoSlot[] = [
	{label: 'Project icon 1', box: {x: 20, y: 19, size: 8}},
	{label: 'Project icon 2', box: {x: 17, y: 24, size: 8}},
	{label: 'Project icon 3', box: {x: 24, y: 24, size: 8}}
];
// 10 wide, the single-badge size, rather than the 14 of the reference export: at 14 the two icons
// carried as much weight as the project they sit on. Held one unit off the top, right and bottom
// edges, so the pair reads as symmetric.
const STACKED_SLOTS: TLogoSlot[] = [
	{label: 'Related project', box: {x: 21, y: 1, size: 10}},
	{label: 'Token', box: {x: 21, y: 21, size: 10}}
];

const FALLBACK_BACKING = '#FFFFFF';

// The fill is pushed slightly past the hole it fills. Measured edges never meet cleanly — Compound's
// arcs start at 14.05 against a hole of 14 — and antialiasing widens that into a visible hairline of
// the white coin. Overlapping costs nothing, because the artwork paints on top of the fill.
//
// Clamped to the coin, which is what keeps Iron Bank honest: its hole and its coin are both 12, so
// without the clamp the colour would spill past the disc it is supposed to sit on.
const HOLE_OVERLAP = 0.5;

// The radius is FIXED per template, never the fitted box: the disc is the backing the logo sits on,
// so shrinking it alongside the logo defeats the point — the logo spills over its own background.
// Nor is it the whole canvas, which would swallow a template whose artwork stops short of the frame.
//
// Two discs, not one, because they are two different things:
//
//  - the COIN, at backingRadius, is the white disc a protocol's own mark is drawn on. It stays white:
//    it is brand artwork. Tinting it swallowed Yearn entirely — its arrow is a thin ring, so a
//    full-canvas disc in the token's colour showed through everywhere the arrow was not, and the mark
//    lost its silhouette. Compound survived only because its arcs are thick enough to cover it.
//  - the HOLE, at the artwork's free radius, is the gap between the token and the frame. That takes
//    the token's own rim colour, which is what stops a coloured token reading as a coin on a white
//    coaster. Under Yearn the hole is the size of the token, so the token covers it and nothing
//    changes; under Compound it is two units wider, and that ring is exactly what was white before.
function backing(radius: number, centreX: number, centreY: number, color?: string): string[] {
	if (radius <= 0) {
		return [];
	}
	return [`<circle cx="${centreX}" cy="${centreY}" r="${radius}" fill="${color || FALLBACK_BACKING}"/>`];
}

// Always white, never the token's colour: this is the opt-in disc the user asked for by name. A round
// coloured token does yield a rim colour, and painting the disc in it made "White background" produce
// anything but.
function optionalBacking(options: TBuildOptions, radius: number, centreX: number, centreY: number): string[] {
	if (!options.hasBackground) {
		return [];
	}
	return backing(radius, centreX, centreY);
}

// A full-bleed base plus icons at fixed boxes. Unfilled slots are skipped rather than reserved,
// which is what lets the preview show the base before every icon has been picked.
function buildBadged(badgeSlots: TLogoSlot[]): TLogoTemplate['build'] {
	return (base, badges, options) => {
		// Pulled in only when there is a disc to sit on. Left full-bleed otherwise, which is what the
		// reference logos do — the square viewport clips whatever reaches past the circle.
		let placement = FULL_CANVAS;
		if (options.hasBackground) {
			placement = fitRadially(FULL_CANVAS, CANVAS_RADIUS, base.inkRatio);
		}
		placement = shrinkBox(placement, options.scale);
		const layers = [
			...optionalBacking(options, CANVAS_RADIUS, CANVAS_CENTRE, CANVAS_CENTRE),
			placeFragment(base, placement)
		];
		badgeSlots.forEach((slot, index) => {
			const badge = badges[index];
			if (badge) {
				layers.push(placeFragment(badge, slot.box));
			}
		});
		return composeRoot(layers);
	};
}

// Discrete sizes rather than a scale computed per logo: a handful of steps keeps builds of the same
// template visually consistent, instead of every source landing on its own arbitrary fraction.
//
// Each value is the size a real CDN logo needed — 0.975 a mildly non-circular mark, 0.902 one with
// diagonal limbs (1inch), 0.821 a wider diagonal spread, 0.770 a fully square logo whose ink sits in
// the corners. Measured across 300 logos this ladder clears the ring in every case, and the median
// logo (ratio 1.004, a disc) never leaves the first step.
//
// Math.SQRT1_2 (≈0.707) is the size at which a square inscribes into its own circle. It only comes up against
// a full-canvas backdrop, whose budget is the inscribed circle rather than a ring's inner edge.
//
// The last value doubles as the floor: anything needing less is left to overhang rather than shrunk
// into a postage stamp.
const RADIAL_STEPS = [1, 0.975, 0.902, 0.821, 0.77, Math.SQRT1_2];
const INK_TOLERANCE = 1.005;

function shrinkBox(box: TPlacementBox, factor: number): TPlacementBox {
	if (factor >= 1) {
		return box;
	}
	const size = box.size * factor;
	const inset = (box.size - size) / 2;
	return {x: box.x + inset, y: box.y + inset, size};
}

// Fitting is rectangular, the hole is round — see inkRadius.ts. Shrinks the box around its own
// centre so the ink lands inside `maxInkRadius`; a disc measures ~1.00 and never moves.
function fitRadially(box: TPlacementBox, maxInkRadius: number, inkRatio?: number): TPlacementBox {
	if (!inkRatio) {
		return box;
	}
	// The tolerance absorbs what is left of the antialiasing fringe in the measurement: a perfect disc
	// rasterizes at ~1.004 rather than 1.000, so a budget set exactly to the box radius would bump
	// every ordinary token down a step for nothing. Far below the 1.1 a non-circular logo reaches.
	const budget = (maxInkRadius / (box.size / 2)) * INK_TOLERANCE;
	const step =
		RADIAL_STEPS.find(candidate => inkRatio * candidate <= budget) ?? RADIAL_STEPS[RADIAL_STEPS.length - 1];
	return shrinkBox(box, step);
}

// A single token sandwiched in fixed artwork. Everything is centred on the box, which is where the
// artwork's own opening is: Iron Bank's disc sits at 17,17 because its box does.
type TFramedConfig = {
	box: TPlacementBox;
	// Painted between the backing and the token; `over` goes in front of it — Aave's rings sit on top,
	// and Iron Bank's cyan mark crosses in front.
	under?: string;
	over?: string;
	// The radius the token's ink must stay within: the artwork's tightest approach.
	maxInkRadius: number;
	// The white disc a protocol's own mark is drawn on. Absent means the template has none.
	backingRadius?: number;
	// The area filled with the token's colour AT FULL SIZE. Defaults to maxInkRadius, which is right
	// when the artwork's tightest point IS its opening. Yearn needs them apart: its arrowhead dips to 8
	// so the token is held to 9, but the ring it should fill up to is at 11 — at 9 a white crescent
	// stays between the token and the arrow.
	holeRadius?: number;
};

function buildFramed(config: TFramedConfig): TLogoTemplate['build'] {
	const {box, under = '', over = '', maxInkRadius, backingRadius = 0} = config;
	const holeRadius = config.holeRadius ?? maxInkRadius;
	const centreX = box.x + box.size / 2;
	const centreY = box.y + box.size / 2;
	return (base, _badges, options) => {
		const placement = shrinkBox(fitRadially(box, maxInkRadius, base.inkRatio), options.scale);
		// Only a template that owns a coin gets its hole filled: the rest have no frame to fill up to,
		// and Aave deliberately leaves that sliver transparent.
		//
		// The fill follows the size slider, because a token's background is part of the token: pulling
		// the size in shrinks the logo and the ground it sits on together, and the coin shows around
		// them.
		let holeFill: string[] = [];
		if (backingRadius > 0) {
			const filled = Math.min(holeRadius + HOLE_OVERLAP, backingRadius) * options.scale;
			holeFill = backing(filled, centreX, centreY, base.edgeColor);
		}
		return composeRoot([
			...backing(backingRadius, centreX, centreY),
			...holeFill,
			under,
			...optionalBacking(options, maxInkRadius, centreX, centreY),
			placeFragment(base, placement),
			over
		]);
	};
}

// The room each decoration leaves for the token, measured off the artwork itself.
// Both Aave rings have their inner edge at r = 14.
const AAVE_RING_INNER_RADIUS = 14;
// The arrow's ring sits at 10.86, but its arrowhead dips to 8.06 in 3 sectors out of 71. The token
// is sized to clear the arrowhead, which is the mark's distinctive feature — sizing to the ring
// would bury it.
const YEARN_HOLE_RADIUS = 9;
// The ring's own inner edge, which is what the token's colour fills up to. Wider than the token's
// budget above, so the coloured area stays put while the size slider moves the token inside it.
const YEARN_RING_RADIUS = 11;
const COMPOUND_HOLE_RADIUS = 14;
// Not the cyan mark's nearest approach (9.44): the mark deliberately crosses in front of the token,
// which is why it paints over. The white disc it sits on is the real limit.
const IRONBANK_DISC_RADIUS = 12;

export const LOGO_TEMPLATES: TLogoTemplate[] = [
	{
		ID: 'project',
		supportsBackground: true,
		label: 'Project badge',
		baseLabel: 'Base token',
		badgeSlots: ONE_BADGE,
		build: buildBadged(ONE_BADGE)
	},
	{
		ID: 'project-2',
		supportsBackground: true,
		label: 'Two projects',
		baseLabel: 'Base token',
		badgeSlots: TWO_BADGES,
		build: buildBadged(TWO_BADGES)
	},
	{
		ID: 'project-3',
		supportsBackground: true,
		label: 'Three projects',
		baseLabel: 'Base token',
		badgeSlots: THREE_BADGES,
		build: buildBadged(THREE_BADGES)
	},
	{
		ID: 'project-stack',
		supportsBackground: true,
		label: 'Project stack',
		baseLabel: 'Project',
		badgeSlots: STACKED_SLOTS,
		build: buildBadged(STACKED_SLOTS)
	},
	{
		ID: 'aave-wrapped',
		supportsBackground: true,
		label: 'Aave wrapped',
		baseLabel: 'Base token',
		badgeSlots: [],
		// 26, not the 28 the reference disc measures: at 28 the token butts straight against the
		// ring's inner edge (r = 14). 26 leaves a unit of clearance, matching the solid-ring variant.
		// placeFragment fits to the longer side, so a non-square source lands under 26 on both axes.
		build: buildFramed({box: {x: 3, y: 3, size: 26}, over: AAVE_DOTTED_RING, maxInkRadius: AAVE_RING_INNER_RADIUS})
	},
	{
		ID: 'aave-interest-bearing',
		supportsBackground: true,
		label: 'Aave interest bearing',
		baseLabel: 'Base token',
		badgeSlots: [],
		build: buildFramed({box: {x: 3, y: 3, size: 26}, over: AAVE_SOLID_RING, maxInkRadius: AAVE_RING_INNER_RADIUS})
	},
	{
		ID: 'yearn',
		supportsBackground: false,
		label: 'Yearn vault',
		baseLabel: 'Base token',
		badgeSlots: [],
		build: buildFramed({
			box: {x: 7, y: 7, size: 18},
			under: YEARN_ARROW,
			maxInkRadius: YEARN_HOLE_RADIUS,
			backingRadius: CANVAS_RADIUS,
			holeRadius: YEARN_RING_RADIUS
		})
	},
	{
		ID: 'compound',
		supportsBackground: false,
		label: 'Compound',
		baseLabel: 'Base token',
		badgeSlots: [],
		build: buildFramed({
			box: {x: 4, y: 4, size: 24},
			under: COMPOUND_ARCS,
			maxInkRadius: COMPOUND_HOLE_RADIUS,
			backingRadius: CANVAS_RADIUS
		})
	},
	{
		ID: 'iron-bank',
		supportsBackground: false,
		label: 'Iron Bank',
		baseLabel: 'Base token',
		badgeSlots: [],
		build: buildFramed({
			box: {x: 5, y: 5, size: 24},
			over: IRONBANK_MARK,
			maxInkRadius: IRONBANK_DISC_RADIUS,
			backingRadius: IRONBANK_DISC_RADIUS
		})
	}
];

export function findLogoTemplate(ID: TLogoTemplateID): TLogoTemplate {
	const template = LOGO_TEMPLATES.find(entry => entry.ID === ID);
	if (!template) {
		return LOGO_TEMPLATES[0];
	}
	return template;
}
