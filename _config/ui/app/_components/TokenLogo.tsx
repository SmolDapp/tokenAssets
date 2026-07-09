'use client';

import {tokenLogoURI} from '@utils/helpers';
import {motion} from 'framer-motion';
import Image from 'next/image';

import type {TLogoFile, TToken} from '@utils/types';
import type {ReactElement} from 'react';

const MotionImage = motion.create(Image);

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
		<MotionImage
			initial={{opacity: 0, scale: 0.9}}
			animate={{opacity: 1, scale: 1}}
			transition={{duration: 0.3}}
			unoptimized
			{...loadingProps(index)}
			src={tokenLogoURI(chainID, token.address, file)}
			alt={`${token.symbol || token.address} icon`}
			className={className}
			width={size}
			height={size}
			onError={e => {
				e.currentTarget.src = '/token-placeholder.svg';
			}}
		/>
	);
}
