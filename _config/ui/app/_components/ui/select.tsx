/* eslint-disable @typescript-eslint/explicit-function-return-type */

'use client';

import {cn} from '@components/lib/utils';
import ArrowDown from '@icons/arrow-down.svg';
import * as SelectPrimitive from '@radix-ui/react-select';
import {type ComponentPropsWithoutRef, type ElementRef, forwardRef} from 'react';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = forwardRef<
	ElementRef<typeof SelectPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({className, children, ...props}, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			'flex h-12 w-full items-center justify-between border-none bg-transparent p-4 text-sm ring-offset-primary-light placeholder:text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
			className
		)}
		{...props}>
		{children}
		<SelectPrimitive.Icon asChild>
			<ArrowDown className={'size-4'} />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = forwardRef<
	ElementRef<typeof SelectPrimitive.ScrollUpButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({className, ...props}, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn('flex cursor-default items-center justify-center py-1', className)}
		{...props}>
		<ArrowDown className={'size-4 rotate-180'} />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = forwardRef<
	ElementRef<typeof SelectPrimitive.ScrollDownButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({className, ...props}, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn('flex cursor-default items-center justify-center py-1', className)}
		{...props}>
		<ArrowDown className={'size-4'} />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = forwardRef<
	ElementRef<typeof SelectPrimitive.Content>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({className, children, position = 'popper', ...props}, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className={cn(
				'relative z-50 max-h-96 min-w-[8rem] overflow-hidden bg-white',
				'rounded-sm border border-separator',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=open]:animate-in',
				'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				'w-[240px]',
				className
			)}
			position={position}
			align={'end'}
			{...props}>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = forwardRef<
	ElementRef<typeof SelectPrimitive.Label>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({className, ...props}, ref) => (
	<SelectPrimitive.Label ref={ref} className={cn('py-1.5 pr-2 pl-8 font-semibold text-sm', className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = forwardRef<
	ElementRef<typeof SelectPrimitive.Item>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({className, children, ...props}, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex h-12 w-full cursor-pointer select-none items-center px-3 py-4 outline-none',
			'transition-all',
			'bg-white hover:bg-primary',
			'text-black/70 hover:text-white data-[state=checked]:text-primary data-[state=checked]:hover:text-white',
			'font-medium text-xs',
			className
		)}
		{...props}>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = forwardRef<
	ElementRef<typeof SelectPrimitive.Separator>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({className, ...props}, ref) => (
	<SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-neutral-100', className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue
};
