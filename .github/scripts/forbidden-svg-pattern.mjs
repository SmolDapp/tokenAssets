// The `{0,256}` bound (vs `*`) keeps the scan linear on adversarial inputs full of `data:` repetitions
// (polynomial ReDoS otherwise); real data-URI mediatypes are far shorter than 256 chars.
// Mirrored by `_config/ui/app/_utils/svgSafety.ts` — keep the two in sync.
export const ForbiddenSVGPattern =
	/data:[^,]{0,256};\s*base64|href\s*=\s*["']?(https?:|\/\/)|<script|javascript:|[^a-z0-9_-]on[a-z]+\s*=/i;
