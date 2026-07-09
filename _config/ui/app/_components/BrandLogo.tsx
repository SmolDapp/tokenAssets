import {cn} from '@components/lib/utils';
import EyeLeft from '@icons/eye-shape-left.svg';
import EyeRight from '@icons/eye-shape-right.svg';

import type {ReactElement} from 'react';

export function BrandLogo({className}: {className?: string}): ReactElement {
	return (
		<div className={cn('rounded-sm border border-white/40 px-2.5 py-2', className)}>
			<div className={'flex flex-row items-center gap-1.5'}>
				<EyeLeft className={'size-4'} />
				<EyeRight className={'size-4'} />
			</div>
		</div>
	);
}
