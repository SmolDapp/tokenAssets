// Reads a token's current metadata and logo so the submit form can show what is on disk before editing
// it. The logo CDN does not serve info.json, so this reads the repo directly — raw.githubusercontent
// sends access-control-allow-origin: *, which is what lets the browser do it without a proxy route.

import {GITHUB_RAW_TOKENS_URI} from '@utils/constants';
import {parseInfoJson, type TTokenInfo} from '@utils/infoJson';
import {toFolderAddress} from '@utils/tokenSubmission';

export type TTokenPrefill = {
	// null for the token folders that carry logos but no info.json — a normal case, not a failure.
	info: TTokenInfo | null;
	// Empty when the current logo could not be read: the form then asks for a new one rather than
	// pretending the token has none.
	svgText: string;
};

export async function fetchTokenPrefill(chainID: string, address: string): Promise<TTokenPrefill> {
	const folder = `${GITHUB_RAW_TOKENS_URI}/${chainID}/${toFolderAddress(address)}`;
	const [infoResponse, svgResponse] = await Promise.all([
		fetch(`${folder}/info.json`, {cache: 'no-store'}),
		fetch(`${folder}/logo.svg`, {cache: 'no-store'})
	]);

	let svgText = '';
	if (svgResponse.ok) {
		svgText = await svgResponse.text();
	}

	if (infoResponse.status === 404) {
		return {info: null, svgText};
	}
	// Anything other than "present" or "genuinely absent" has to throw: an empty form that silently
	// stood in for a failed read would look exactly like a deliberate erasure.
	if (!infoResponse.ok) {
		throw new Error(`Could not read info.json (${infoResponse.status})`);
	}

	const info = parseInfoJson(await infoResponse.text());
	if (!info) {
		throw new Error('info.json has a field this form cannot edit');
	}
	return {info, svgText};
}
