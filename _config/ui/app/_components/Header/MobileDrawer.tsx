import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from '@components/ui/drawer';
import {useChain} from '@contexts/WithChain';
import Cross from '@icons/cross.svg';
import {CHAINS, GITHUB_URI} from '@utils/constants';
import {replaceChainSlug} from '@utils/helpers';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';

import type {ReactElement} from 'react';

export function MobileMenuDrawer({isOpen, onClose}: {isOpen: boolean; onClose: () => void}): ReactElement {
	const {chain} = useChain();
	const router = useRouter();
	const pathname = usePathname();

	const handleChainSelect = (slug: string): void => {
		router.replace(replaceChainSlug(pathname, slug), {scroll: false});
		onClose();
	};

	return (
		<Drawer
			modal={true}
			direction={'bottom'}
			open={isOpen}
			onOpenChange={open => {
				if (!open) {
					onClose();
				}
			}}>
			<DrawerContent
				side={'bottom'}
				className={'inset-x-2 bottom-2 h-fit overflow-hidden rounded-[4px] border-0 bg-primary p-0'}>
				<DrawerTitle className={'sr-only'}>{'Mobile menu'}</DrawerTitle>
				<DrawerDescription className={'sr-only'}>{'Mobile menu'}</DrawerDescription>
				<div className={'flex w-full flex-col gap-2 p-6'}>
					<div className={'relative flex items-center justify-between'}>
						<p className={'font-bold font-mono text-2xl text-white uppercase'}>{'Token Assets'}</p>
						<button type={'button'} onClick={onClose} className={'absolute top-0 right-0'}>
							<Cross className={'size-4 text-white'} />
						</button>
					</div>
					<Link href={GITHUB_URI} target={'_blank'} rel={'noopener noreferrer'}>
						<button
							type={'button'}
							className={cn(
								'flex h-10 w-full items-center justify-center rounded-sm p-3',
								'text-primary text-xs uppercase',
								'bg-white transition-colors hover:bg-border-gray',
								'border border-transparent'
							)}>
							<p className={'truncate text-sm'}>{'CONTRIBUTE ON GITHUB'}</p>
						</button>
					</Link>
					<div className={'max-h-[40vh] overflow-y-auto'}>
						<div className={'flex flex-col gap-1'}>
							{CHAINS.map(network => (
								<button
									key={network.id}
									type={'button'}
									onClick={() => handleChainSelect(network.slug)}
									className={cn(
										'flex items-center justify-between rounded-sm p-3 text-left text-xs uppercase',
										'transition-colors',
										network.id === chain.id
											? 'bg-white text-primary'
											: 'text-white hover:bg-primary-light'
									)}>
									<span className={'flex items-center gap-2.5'}>
										<ChainLogo
											id={network.id}
											className={'size-5 shrink-0 rounded-full object-contain'}
										/>
										{network.name}
									</span>
									<span className={'opacity-60'}>{network.count}</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
