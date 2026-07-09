'use client';

import {CHAINS} from '@utils/constants';
import {tokenLogoURI, tokenPageURI, truncateAddress} from '@utils/helpers';
import Image from 'next/image';
import Link from 'next/link';

import type {ReactElement} from 'react';

const SLUG_BY_ID = new Map(CHAINS.map(chain => [chain.id, chain.slug]));

export function LogoWall({logos}: {logos: {chainID: string; address: string}[]}): ReactElement {
	return (
		<div className={'grid grid-cols-6 gap-3 sm:gap-4 lg:grid-cols-5'}>
			{logos.map(({chainID, address}) => (
				<Link
					key={`${chainID}-${address}`}
					href={tokenPageURI(SLUG_BY_ID.get(chainID) || chainID, address)}
					aria-label={`Open token ${truncateAddress(address, 4)}`}
					className={'flex aspect-square items-center justify-center'}>
					<Image
						unoptimized
						loading={'eager'}
						src={tokenLogoURI(chainID, address)}
						alt={''}
						width={64}
						height={64}
						className={
							'outlined size-14 rounded-full bg-white/[0.06] object-contain transition-transform hover:scale-110 md:size-16'
						}
						onError={e => {
							e.currentTarget.src = '/token-placeholder.svg';
						}}
					/>
				</Link>
			))}
		</div>
	);
}
