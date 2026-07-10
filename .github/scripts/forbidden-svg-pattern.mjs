// The `{0,256}` bound (vs `*`) keeps the scan linear on adversarial inputs full of `data:` repetitions
// (polynomial ReDoS otherwise); real data-URI mediatypes are far shorter than 256 chars.
// `data:image/<raster>` catches an embedded raster regardless of encoding (base64 or percent-encoded).
// Mirrored by `_config/ui/app/_utils/svgSafety.ts` and verify-fork.yml's env — keep all three in sync.
export const ForbiddenSVGPattern =
	/data:image\/(png|jpe?g|gif|webp|bmp|avif)|data:[^,]{0,256};\s*base64|href\s*=\s*["']?(https?:|\/\/)|<script|javascript:|[^a-z0-9_-]on[a-z]+\s*=/i;
