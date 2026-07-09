import {cn} from '@components/lib/utils';

import type {ReactElement} from 'react';

export function NewBadge({className}: {className?: string}): ReactElement {
	return (
		<span
			className={cn(
				'rounded-sm bg-primary px-1.5 py-0.5 font-medium text-white text-xxs uppercase leading-none',
				className
			)}>
			{'New'}
		</span>
	);
}
