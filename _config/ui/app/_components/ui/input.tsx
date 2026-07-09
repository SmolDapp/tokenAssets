import {cn} from '@components/lib/utils';
import {type ComponentProps, forwardRef} from 'react';

const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(({className, type, ...props}, ref) => {
	return (
		<input
			type={type}
			className={cn(
				'flex h-10 w-full rounded-sm ring-offset-transparent placeholder:text-subtle placeholder:uppercase',
				'bg-transparent px-3 py-2 text-base text-black file:border-0 file:bg-transparent',
				'file:font-medium file:text-sm file:text-white',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-transparent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				'[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden',
				className
			)}
			ref={ref}
			{...props}
		/>
	);
});
Input.displayName = 'Input';

export {Input};
