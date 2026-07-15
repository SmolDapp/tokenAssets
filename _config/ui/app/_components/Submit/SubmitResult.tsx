'use client';

import {cn} from '@components/lib/utils';
import {Button} from '@components/ui/button';
import Check from '@icons/check.svg';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

import type {ReactElement} from 'react';

export function SubmitResult({
	prURL,
	onClose,
	showSubmitAnother = true
}: {
	prURL: string | null;
	onClose: () => void;
	showSubmitAnother?: boolean;
}): ReactElement {
	return (
		<Dialog.Root
			open={Boolean(prURL)}
			onOpenChange={open => {
				if (!open) {
					onClose();
				}
			}}>
			<Dialog.Portal>
				<Dialog.Overlay className={'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]'} />
				<Dialog.Content
					className={cn(
						'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
						'space-y-5 rounded-sm border border-separator bg-[#ffffff] p-6 shadow-2xl',
						'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=open]:animate-in'
					)}>
					<div className={'flex items-center gap-2'}>
						<Check className={'size-5 text-success'} />
						<Dialog.Title className={'font-medium font-mono text-black text-sm uppercase tracking-[0.1em]'}>
							{'Pull request opened'}
						</Dialog.Title>
					</div>
					<Dialog.Description className={'font-mono text-black/60 text-sm leading-relaxed'}>
						{
							'Your logo and metadata are now a pull request on the Token Assets repository. A maintainer will review and merge it — nothing else to do.'
						}
					</Dialog.Description>
					<div className={'flex flex-wrap gap-3'}>
						<Link
							href={prURL || '#'}
							target={'_blank'}
							rel={'noopener noreferrer'}>
							<Button variant={'default'}>{'View pull request →'}</Button>
						</Link>
						{showSubmitAnother && (
							<Button
								variant={'outline'}
								onClick={onClose}>
								{'Submit another'}
							</Button>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
