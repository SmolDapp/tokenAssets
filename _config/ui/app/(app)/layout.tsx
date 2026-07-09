import {Header} from '@components/Header/Header';
import type {ReactElement, ReactNode} from 'react';

export default async function Layout({children}: {children: ReactNode}): Promise<ReactElement> {
	return (
		<div
			id={'root-container'}
			className={'flex min-h-screen w-full flex-col'}>
			<Header />
			<main>{children}</main>
		</div>
	);
}
