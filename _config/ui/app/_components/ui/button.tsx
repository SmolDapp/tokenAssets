import {cn} from '@components/lib/utils';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {type ButtonHTMLAttributes, forwardRef} from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs font-medium text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-separator disabled:text-subtle dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-white hover:bg-primary-light',
				primary: 'bg-white text-primary hover:bg-secondary',
				destructive: 'bg-error text-white hover:bg-error/80',
				outline: 'border border-primary bg-transparent text-primary hover:bg-secondary hover:text-primary',
				secondary:
					'bg-primary-light text-white hover:bg-primary-light/60 dark:bg-secondary dark:text-primary dark:hover:bg-secondary/80',
				ghost: 'text-primary hover:bg-primary hover:text-white',
				link: 'text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50'
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 px-3',
				xs: 'h-7 px-3 text-xxs',
				lg: 'h-11 px-8',
				icon: 'size-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export type TButtonProps = {
	asChild?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, TButtonProps>(
	({className, variant, size, asChild = false, ...props}, ref) => {
		const Comp = asChild ? Slot : 'button';
		return <Comp className={cn(buttonVariants({variant, size, className}))} ref={ref} {...props} />;
	}
);
Button.displayName = 'Button';

export {Button, buttonVariants};
