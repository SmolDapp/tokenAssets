import {BrandLogo} from '@components/BrandLogo';
import {MobileMenuDrawer} from '@components/Header/MobileDrawer';
import {cn} from '@components/lib/utils';
import {useChain} from '@contexts/WithChain';
import Grid from '@icons/grid.svg';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

import type {ReactElement} from 'react';

export function MenuButtons(): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const {chain} = useChain();
	const isExplorePage = pathname.split('/').length === 2;

	return (
		<div className={'flex gap-4 max-md:items-center max-md:pb-4'}>
			<div className={'flex items-center gap-4'}>
				<Link href={'/'} aria-label={'Token Assets home'}>
					<BrandLogo className={'transition-colors hover:bg-primary-light'} />
				</Link>
				<div className={'flex flex-col'}>
					<Link
						href={`/${chain.slug}`}
						className={cn('w-fit text-white uppercase hover:text-white', isExplorePage ? '' : 'opacity-50')}
						aria-current={isExplorePage ? 'page' : undefined}>
						{'Token Assets'}
					</Link>
					<p className={'font-normal text-white/60 text-xs uppercase leading-tight'}>
						{`${chain.count} tokens on ${chain.name}`}
					</p>
				</div>
			</div>
			<div className={'ml-auto md:hidden'}>
				<button type={'button'} onClick={() => setIsOpen(true)} aria-label={'Open menu'}>
					<Grid aria-hidden={'true'} className={'size-6 min-h-6 min-w-6 text-white'} />
				</button>
				<MobileMenuDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
			</div>
		</div>
	);
}
