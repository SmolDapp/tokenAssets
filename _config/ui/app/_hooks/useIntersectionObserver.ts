import {useCallback, useEffect, useRef} from 'react';

export function useIntersectionObserver(
	callback: () => void,
	options: IntersectionObserverInit = {threshold: 0.1}
): (node: Element | null) => void {
	const observer = useRef<IntersectionObserver | undefined>(undefined);
	// Read the latest callback/options through refs so the returned `ref` can stay referentially
	// stable. A fresh `ref` identity each render makes React re-run it (disconnect + observe) on
	// every render — and re-observing an already-visible sentinel fires the callback again, so an
	// infinite-scroll list would re-trigger fetchNextPage on unrelated re-renders.
	const callbackRef = useRef(callback);
	callbackRef.current = callback;
	const optionsRef = useRef(options);

	const ref = useCallback((node: Element | null): void => {
		if (observer.current) {
			observer.current.disconnect();
		}

		if (node) {
			observer.current = new IntersectionObserver(entries => {
				if (entries[0].isIntersecting) {
					callbackRef.current();
				}
			}, optionsRef.current);

			observer.current.observe(node);
		}
	}, []);

	useEffect(() => {
		return () => {
			if (observer.current) {
				observer.current.disconnect();
			}
		};
	}, []);

	return ref;
}
