// Carries a logo built on /builder over to the submit form.
//
// Deliberately NOT the form's own `token-submit-stash`, which the OAuth round-trip uses: that stash
// restores every field, so writing a logo into it would also blank the chain and address the user
// may have arrived with via /submit?chain=…&address=….

const HANDOFF_KEY = 'token-builder-handoff';

export type TBuilderHandoff = {svgText: string; svgFileName: string};

export function writeBuilderHandoff(handoff: TBuilderHandoff): void {
	sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
}

// Consumes the handoff: a reload of /submit must not silently re-apply a logo the user has since
// replaced or cleared.
export function consumeBuilderHandoff(): TBuilderHandoff | null {
	const raw = sessionStorage.getItem(HANDOFF_KEY);
	if (!raw) {
		return null;
	}
	sessionStorage.removeItem(HANDOFF_KEY);
	try {
		const parsed = JSON.parse(raw) as Partial<TBuilderHandoff>;
		if (!parsed.svgText) {
			return null;
		}
		return {svgText: parsed.svgText, svgFileName: parsed.svgFileName || 'built.svg'};
	} catch {
		return null;
	}
}
