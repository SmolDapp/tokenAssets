// Mirrors `.github/scripts/forbidden-svg-pattern.mjs` in the tokenAssets repo — the exact check the
// repo's CI runs on every token PR. Rejects scripts, event handlers, external links and base64 rasters,
// so we never open a PR that verify-tokens.mjs would reject.
// The `{0,256}` bound (vs `*`) keeps the scan linear on adversarial inputs full of `data:` repetitions
// (polynomial ReDoS otherwise); real data-URI mediatypes are far shorter than 256 chars.
const FORBIDDEN_SVG_PATTERN =
	/data:[^,]{0,256};\s*base64|href\s*=\s*["']?(https?:|\/\/)|<script|javascript:|[^a-z0-9_-]on[a-z]+\s*=/i;

export function isForbiddenSvg(svg: string): boolean {
	return FORBIDDEN_SVG_PATTERN.test(svg);
}
