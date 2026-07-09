import {BrandLogo} from '@components/BrandLogo';
import Link from 'next/link';

import type {ReactElement} from 'react';

export function BrandMark(): ReactElement {
	return (
		<Link href={'/'} className={'flex w-fit items-center gap-3'}>
			<BrandLogo className={'transition-colors hover:bg-primary-light'} />
			<span className={'font-medium font-mono text-sm text-white uppercase tracking-[0.08em]'}>
				{'Token Assets'}
			</span>
		</Link>
	);
}
