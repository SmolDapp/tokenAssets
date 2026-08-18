// Whether the token drawer about to open was opened by clicking a card on the list right below it.
// Only then is the entry under it in history that same list, which is what lets the close button
// pop with back() instead of navigating. Every other entry point — the command palette, a shared
// link, a reload — leaves something else underneath, so popping would drop the search or walk off
// the site entirely. Consumed when the drawer opens, so a click that never opened one here
// (⌘-click into a new tab) cannot leave the flag set for the next one.
let openedFromList = false;

export function markOpenedFromList(): void {
	openedFromList = true;
}

export function consumeOpenedFromList(): boolean {
	const wasOpenedFromList = openedFromList;
	openedFromList = false;
	return wasOpenedFromList;
}
