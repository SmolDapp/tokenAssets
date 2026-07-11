'use client';

import {Button} from '@components/ui/button';
import {useChain} from '@contexts/WithChain';
import GrumpyIcon from '@icons/grumpy.svg';
import Link from 'next/link';
import type {ReactElement} from 'react';
import {Suspense} from 'react';

function NotFoundContent(): ReactElement {
	const {chain} = useChain();
	return (
		<div className={'flex h-[calc(100vh-200px)] w-full flex-col items-center justify-center gap-6'}>
			<GrumpyIcon className={'size-24'} />
			<div className={'flex flex-col items-center gap-2 text-center'}>
				<p className={'font-semibold text-lg text-primary'}>{'PAGE NOT FOUND.'}</p>
				<p className={'text-sm text-subtle'}>{'The page you are looking for does not exist.'}</p>
			</div>
			<Link href={`/${chain.slug}`}>
				<Button className={'bg-primary text-white hover:bg-primary-light'} size={'lg'}>
					{'GO TO HOME'}
				</Button>
			</Link>
		</div>
	);
}

export default function NotFound(): ReactElement {
	return (
		<Suspense>
			<NotFoundContent />
		</Suspense>
	);
}
