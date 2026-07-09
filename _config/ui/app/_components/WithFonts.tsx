'use client';
import {Geist_Mono} from 'next/font/google';

import type {ReactElement, ReactNode} from 'react';

const geistMono = Geist_Mono({
	weight: ['400', '500', '600', '700'],
	subsets: ['latin'],
	display: 'swap',
	variable: '--geist-mono-font'
});

export function WithFonts({children}: {children: ReactNode}): ReactElement {
	return (
		<div style={{fontFamily: `${geistMono.style.fontFamily}`}}>
			<style jsx global>
				{`
					:root {
						--geist-mono-font: ${geistMono.style.fontFamily};
					}
				`}
			</style>

			{children}
		</div>
	);
}
