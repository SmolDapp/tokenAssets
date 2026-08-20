// Mirrors `.github/scripts/forbidden-svg-pattern.mjs` and the SVG_FORBIDDEN_PATTERN env in
// `.github/workflows/verify-fork.yml` — the exact check the repo's CI runs on every token PR.
// Rejects scripts, event handlers, external links and embedded rasters, so we never open a PR
// that verify-tokens.mjs would reject. KEEP ALL THREE COPIES IN SYNC.
// - `data:image/<raster>` matches an embedded raster regardless of encoding (base64 OR percent-
//   encoded); the separate `data:…;base64` arm still catches base64 payloads with other mediatypes.
// - The `{0,256}` bound (vs `*`) keeps the scan linear on adversarial inputs full of `data:`
//   repetitions (polynomial ReDoS otherwise); real data-URI mediatypes are far shorter.
const FORBIDDEN_SVG_PATTERN =
	/data:image\/(png|jpe?g|gif|webp|bmp|avif)|data:[^,]{0,256};\s*base64|href\s*=\s*["']?(https?:|\/\/)|<script|javascript:|[^a-z0-9_-]on[a-z]+\s*=/i;

export function isForbiddenSvg(svg: string): boolean {
	return FORBIDDEN_SVG_PATTERN.test(svg);
}

// Mirrors the detection in svgRaster.server.ts, which cannot be imported here: it pulls in resvg, a
// native server-only package. Kept in this module because both the client and the server need it.
const TEXT_ELEMENT_PATTERN = /<(text|tspan)[\s>]/i;

// The submit route outlines `<text>` to paths, so an SVG containing text is never committed as-is —
// re-submitting the exact bytes already on the CDN still produces a different file.
export function containsTextElement(svg: string): boolean {
	return TEXT_ELEMENT_PATTERN.test(svg);
}
