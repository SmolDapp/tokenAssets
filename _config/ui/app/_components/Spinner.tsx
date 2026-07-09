import {cn} from '@components/lib/utils';
import type {ReactElement} from 'react';

const Spinner = ({className}: {className?: string}): ReactElement => (
	<div
		className={cn(
			'inline-block size-4 animate-spin rounded-full border-2',
			'border-current border-r-transparent align-[-0.125em] text-primary',
			className
		)}
	/>
);

export {Spinner};
