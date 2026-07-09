import {chainLogoURI} from '@utils/helpers';
import Image from 'next/image';

import type {ReactElement} from 'react';

export function ChainLogo({id, className}: {id: string; className?: string}): ReactElement {
	return (
		<Image
			unoptimized
			loading={'eager'}
			src={chainLogoURI(id, 'logo-32.png')}
			alt={''}
			width={20}
			height={20}
			className={className || 'size-4 shrink-0 rounded-full object-contain'}
			onError={e => {
				e.currentTarget.src = '/token-placeholder.svg';
			}}
		/>
	);
}
