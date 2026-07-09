import type {ReactElement, ReactNode} from 'react';

// Hosts the parallel `@drawer` slot so a token can render as an overlay above the
// still-mounted list on soft navigation, while `[address]/page.tsx` stays a real page
// on direct hits. See `@drawer/(.)[address]/page.tsx`.
export default function ChainLayout({children, drawer}: {children: ReactNode; drawer: ReactNode}): ReactElement {
	return (
		<>
			{children}
			{drawer}
		</>
	);
}
