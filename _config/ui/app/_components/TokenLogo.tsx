'use client';

import {cn} from '@components/lib/utils';
import {tokenLogoURI} from '@utils/helpers';
import type {TLogoFile, TToken} from '@utils/types';
import Image from 'next/image';
import type {ReactElement} from 'react';

// The first tokens on screen load eagerly with high priority; the rest lazily.
function loadingProps(index: number): {priority: boolean; fetchPriority: 'high' | 'low'; loading: 'eager' | 'lazy'} {
	if (index < 20) {
		return {priority: true, fetchPriority: 'high', loading: 'eager'};
	}
	return {priority: false, fetchPriority: 'low', loading: 'lazy'};
}

type TTokenLogoProps = {
	token: TToken;
	chainID: string;
	size: number;
	className?: string;
	index?: number;
	file?: TLogoFile;
};

export function TokenLogo({token, chainID, size, className, index = 0, file}: TTokenLogoProps): ReactElement {
	return (
		<Image
			unoptimized
			{...loadingProps(index)}
			src={tokenLogoURI(chainID, token.address, file)}
			alt={`${token.symbol || token.address} icon`}
			// The mount fade-in previously used framer-motion; a CSS enter animation
			// (tailwindcss-animate) does the same without shipping the library.
			className={cn('fade-in zoom-in-90 animate-in duration-300', className)}
			width={size}
			height={size}
			onError={e => {
				e.currentTarget.src = '/token-placeholder.svg';
			}}
		/>
	);
}
