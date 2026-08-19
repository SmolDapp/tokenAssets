// Carries a logo built on /builder over to the submit form.
//
// Deliberately NOT the form's own `token-submit-stash`, which the OAuth round-trip uses: that stash
// restores every field, so writing a logo into it would also blank the chain and address the user
// may have arrived with via /submit?chain=…&address=….

const HANDOFF_KEY = 'token-builder-handoff';

export type TBuilderHandoff = {svgText: string; svgFileName: string};

// Both sides swallow storage failures. sessionStorage throws outright when it is disabled, and the
// handoff is a convenience: losing it must not stop the caller navigating to /submit, and must not
// take the page down when /submit reads it on mount.
export function writeBuilderHandoff(handoff: TBuilderHandoff): void {
	try {
		sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
	} catch {
		// /submit opens with an empty logo field; the built SVG is still copyable and downloadable.
	}
}

// Consumes the handoff: a reload of /submit must not silently re-apply a logo the user has since
// replaced or cleared.
export function consumeBuilderHandoff(): TBuilderHandoff | null {
	try {
		const raw = sessionStorage.getItem(HANDOFF_KEY);
		if (!raw) {
			return null;
		}
		sessionStorage.removeItem(HANDOFF_KEY);
		const parsed = JSON.parse(raw) as Partial<TBuilderHandoff>;
		if (!parsed.svgText) {
			return null;
		}
		return {svgText: parsed.svgText, svgFileName: parsed.svgFileName || 'built.svg'};
	} catch {
		return null;
	}
}
