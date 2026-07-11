'use client';

import {cn} from '@components/lib/utils';
import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ElementRef,
	forwardRef,
	type HTMLAttributes,
	type ReactElement
} from 'react';
import {Drawer as DrawerPrimitive} from 'vaul';

const Drawer = ({
	shouldScaleBackground = true,
	direction,
	...props
}: ComponentProps<typeof DrawerPrimitive.Root> & {
	direction?: 'left' | 'right' | 'bottom' | 'top';
}): ReactElement => (
	<DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} direction={direction} {...props} />
);
Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = forwardRef<
	ElementRef<typeof DrawerPrimitive.Overlay>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({className, ...props}, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		className={cn(
			'data-[state=closed]:fade-out data-[state=open]:fade-in fixed inset-0 z-50 bg-black/80 duration-300 data-[state=closed]:animate-out data-[state=open]:animate-in',
			className
		)}
		{...props}
	/>
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = forwardRef<
	ElementRef<typeof DrawerPrimitive.Content>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
		side?: 'left' | 'right' | 'bottom' | 'top';
	}
>(({className, children, side = 'bottom', ...props}, ref) => {
	const baseStyles = {
		bottom: 'inset-x-0 bottom-0 border-t',
		right: 'right-0 inset-y-0 border-l h-full',
		left: 'left-0 inset-y-0 border-r h-full'
	};

	return (
		<DrawerPortal>
			<DrawerOverlay />
			<DrawerPrimitive.Content
				ref={ref}
				style={{userSelect: 'text', WebkitUserSelect: 'text'}}
				className={cn(
					'fixed z-50 flex flex-col bg-background',
					'transition-all duration-300',
					side === 'right' && [
						baseStyles.right,
						'data-[state=closed]:animate-out data-[state=open]:animate-in',
						'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
					],
					side === 'left' && [
						baseStyles.left,
						'data-[state=closed]:animate-out data-[state=open]:animate-in',
						'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
					],
					side === 'bottom' && [
						baseStyles.bottom,
						'data-[state=closed]:animate-out data-[state=open]:animate-in',
						'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom'
					],
					className
				)}
				{...props}>
				<div style={{userSelect: 'text', WebkitUserSelect: 'text'}} className={'size-full'}>
					{children}
				</div>
			</DrawerPrimitive.Content>
		</DrawerPortal>
	);
});
DrawerContent.displayName = 'DrawerContent';

const DrawerHeader = ({className, ...props}: HTMLAttributes<HTMLDivElement>): ReactElement => (
	<div
		style={{userSelect: 'text', WebkitUserSelect: 'text'}}
		className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
		{...props}
	/>
);
DrawerHeader.displayName = 'DrawerHeader';

const DrawerFooter = ({className, ...props}: HTMLAttributes<HTMLDivElement>): ReactElement => (
	<div
		style={{userSelect: 'text', WebkitUserSelect: 'text'}}
		className={cn('mt-auto flex flex-col gap-2 p-4', className)}
		{...props}
	/>
);
DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = forwardRef<
	ElementRef<typeof DrawerPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({className, ...props}, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		style={{userSelect: 'text', WebkitUserSelect: 'text'}}
		className={cn('font-semibold text-lg leading-none tracking-tight', className)}
		{...props}
	/>
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = forwardRef<
	ElementRef<typeof DrawerPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({className, ...props}, ref) => (
	<DrawerPrimitive.Description
		ref={ref}
		style={{userSelect: 'text', WebkitUserSelect: 'text'}}
		className={cn('text-neutral-500 text-sm dark:text-neutral-400', className)}
		{...props}
	/>
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger
};
