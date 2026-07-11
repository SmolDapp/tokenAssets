'use client';

import {cn} from '@components/lib/utils';
import Cross from '@icons/cross.svg';
import * as ToastPrimitives from '@radix-ui/react-toast';
import {cva, type VariantProps} from 'class-variance-authority';
import {type ComponentPropsWithoutRef, type ElementRef, forwardRef, type ReactElement} from 'react';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = forwardRef<
	ElementRef<typeof ToastPrimitives.Viewport>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({className, ...props}, ref) => (
	<ToastPrimitives.Viewport
		ref={ref}
		className={cn(
			'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]',
			className
		)}
		{...props}
	/>
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
	'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-neutral-200 p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[swipe=end]:animate-out data-[swipe=move]:transition-none dark:border-neutral-800',
	{
		variants: {
			variant: {
				default: 'border bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50',
				destructive:
					'destructive group border-red-500 bg-red-500 text-neutral-50 dark:border-red-900 dark:bg-red-900 dark:text-neutral-50'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);

const Toast = forwardRef<
	ElementRef<typeof ToastPrimitives.Root>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({className, variant, ...props}, ref) => {
	return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({variant}), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = forwardRef<
	ElementRef<typeof ToastPrimitives.Action>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({className, ...props}, ref) => (
	<ToastPrimitives.Action
		ref={ref}
		className={cn(
			'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-transparent px-3 font-medium text-sm ring-offset-white transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-neutral-100/40 group-[.destructive]:focus:ring-red-500 group-[.destructive]:hover:border-red-500/30 group-[.destructive]:hover:bg-red-500 group-[.destructive]:hover:text-neutral-50 dark:border-neutral-800 dark:ring-offset-neutral-950 dark:group-[.destructive]:border-neutral-800/40 dark:focus:ring-neutral-300 dark:group-[.destructive]:focus:ring-red-900 dark:hover:bg-neutral-800 dark:group-[.destructive]:hover:border-red-900/30 dark:group-[.destructive]:hover:bg-red-900 dark:group-[.destructive]:hover:text-neutral-50',
			className
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = forwardRef<
	ElementRef<typeof ToastPrimitives.Close>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({className, ...props}, ref) => (
	<ToastPrimitives.Close
		ref={ref}
		className={cn(
			'absolute top-2 right-2 rounded-md p-1 text-neutral-950/50 opacity-0 transition-opacity hover:text-neutral-950 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600 group-[.destructive]:hover:text-red-50 dark:text-neutral-50/50 dark:hover:text-neutral-50',
			className
		)}
		toast-close={''}
		{...props}>
		<Cross className={'size-4'} />
	</ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = forwardRef<
	ElementRef<typeof ToastPrimitives.Title>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({className, ...props}, ref) => (
	<ToastPrimitives.Title ref={ref} className={cn('font-semibold text-sm', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = forwardRef<
	ElementRef<typeof ToastPrimitives.Description>,
	ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({className, ...props}, ref) => (
	<ToastPrimitives.Description ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type TToastProps = ComponentPropsWithoutRef<typeof Toast>;

type TToastActionElement = ReactElement<typeof ToastAction>;

export {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
	type TToastActionElement,
	type TToastProps
};
