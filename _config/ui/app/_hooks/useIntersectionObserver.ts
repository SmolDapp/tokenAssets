import {useEffect, useRef} from 'react';

export function useIntersectionObserver(
	callback: () => void,
	options: IntersectionObserverInit = {threshold: 0.1}
): (node: Element | null) => void {
	const observer = useRef<IntersectionObserver>();

	const ref = (node: Element | null): void => {
		if (observer.current) {
			observer.current.disconnect();
		}

		if (node) {
			observer.current = new IntersectionObserver(entries => {
				if (entries[0].isIntersecting) {
					callback();
				}
			}, options);

			observer.current.observe(node);
		}
	};

	useEffect(() => {
		return () => {
			if (observer.current) {
				observer.current.disconnect();
			}
		};
	}, []);

	return ref;
}
