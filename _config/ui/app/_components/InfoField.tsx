import {cn} from '@components/lib/utils';
import Link from 'next/link';

import type {ReactElement} from 'react';

type TProps = {
	label: string;
	value: string;
	href?: string;
};

export function HttpLink({value, href}: {value: string; href?: string}): ReactElement {
	return (
		<Link
			href={href || value}
			className={cn(
				'group block break-all font-mono text-xs md:text-base',
				'underline decoration-transparent underline-offset-4',
				'transition-colors hover:text-primary hover:decoration-primary'
			)}
			target={'_blank'}
			rel={'noopener noreferrer'}>
			{value}
			<LinkOutIcon
				className={
					'ml-2 inline-block size-3 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
				}
			/>
		</Link>
	);
}

function LinkOutIcon({className}: {className?: string}): ReactElement {
	return (
		<svg
			className={className}
			viewBox={'0 0 12 12'}
			fill={'none'}
			xmlns={'http://www.w3.org/2000/svg'}
			aria-hidden={'true'}>
			<path
				d={'M3 1h8v8h-2V4.41L3.71 9.7 2.3 8.29 7.59 3H3V1z'}
				fill={'currentColor'}
			/>
		</svg>
	);
}

export function InfoField({label, value, href}: TProps): ReactElement {
	const isHttpLink = value.startsWith('http');

	return (
		<div className={'space-y-1'}>
			<p className={'font-mono text-subtle text-xs uppercase md:text-sm'}>{label}</p>
			{isHttpLink || href ? (
				<HttpLink
					value={value}
					href={href}
				/>
			) : (
				<p className={'break-all font-mono text-xs md:text-base'}>{value}</p>
			)}
		</div>
	);
}
