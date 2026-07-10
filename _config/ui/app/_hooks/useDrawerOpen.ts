'use client';

import {useSyncExternalStore} from 'react';

// A tiny module-level store for "is the intercepted token drawer currently mounted".
// The intercepted @drawer route sets it on mount/unmount; the header search and command
// palette read it to distinguish a soft-nav drawer (list mounted underneath) from a
// hard-loaded token page (only the full [address] page mounted) — pathname alone cannot
// tell those apart, and getting it wrong desyncs the drawer from the URL.
let isOpen = false;
const listeners = new Set<() => void>();

export function setDrawerOpen(next: boolean): void {
	if (isOpen === next) {
		return;
	}
	isOpen = next;
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useDrawerOpen(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => isOpen,
		() => false
	);
}
