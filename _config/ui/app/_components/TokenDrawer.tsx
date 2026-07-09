'use client';

import {CodeSnippets} from '@components/CodeSnippets';
import {InfoField} from '@components/InfoField';
import {Spinner} from '@components/Spinner';
import {cn} from '@components/lib/utils';
import {Button} from '@components/ui/button';
import {Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from '@components/ui/drawer';
import {useChain} from '@contexts/WithChain';
import Cross from '@icons/cross.svg';
import {copyToClipboard} from '@utils/clipboard';
import {LOGO_FORMATS} from '@utils/constants';
import {explorerAddressURI, tokenGithubURI, tokenLogoURI} from '@utils/helpers';
import Image from 'next/image';
import Link from 'next/link';
import {Fragment, useState} from 'react';

import type {TLogoFile, TToken} from '@utils/types';
import type {ReactElement} from 'react';

type TTokenDrawerProps = {
	token: TToken | null;
	onClose: () => void;
	isOpen: boolean;
};

function TokenDrawer({token, onClose}: {token: TToken; onClose: () => void}): ReactElement {
	const {chain} = useChain();
	const [selectedFile, setSelectedFile] = useState<TLogoFile>('logo-128.png');
	const displayName = token.symbol || token.name || token.address;
	const selectedURL = tokenLogoURI(chain.id, token.address, selectedFile);

	const handleCopyAddress = async (): Promise<void> => {
		await copyToClipboard(token.address, 'Contract address copied to clipboard');
	};

	const handleCopyLogo = async (): Promise<void> => {
		await copyToClipboard(selectedURL, 'Logo URL copied to clipboard');
	};

	return (
		<Fragment>
			<DrawerTitle className={'sr-only'}>{`Token assets for ${displayName}`}</DrawerTitle>
			<DrawerDescription className={'sr-only'}>{`Token assets for ${displayName}`}</DrawerDescription>
			<div className={'h-full overflow-y-auto'}>
				<div className={'flex flex-col gap-4 p-5 md:ml-6 md:px-8 md:py-6'}>
					<div
						className={cn(
							'max-md:hidden',
							'absolute top-0 left-[-1px] h-full w-8 cursor-grab active:cursor-grabbing',
							'bg-[repeating-linear-gradient(45deg,#B2B0AF_0,#B2B0AF_1px,transparent_1px,transparent_4px)]'
						)}
					/>

					<DrawerHeader className={'flex justify-end p-0'}>
						<Button onClick={onClose} className={'text-black'} variant={'ghost'} size={'icon'}>
							<Cross className={'size-4'} />
						</Button>
					</DrawerHeader>

					<div className={'flex flex-col gap-6'}>
						<div
							className={cn(
								'flex h-[160px] items-center justify-center bg-separator',
								'[background-image:radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:12px_12px]',
								'relative'
							)}>
							<div className={'size-28 rounded-full'}>
								<Image
									unoptimized
									src={selectedURL}
									alt={displayName}
									className={'size-28 object-contain'}
									width={112}
									height={112}
									quality={100}
									onError={e => {
										e.currentTarget.src = '/token-placeholder.svg';
									}}
								/>
							</div>
							<div className={'absolute top-2 right-2 flex flex-row items-center gap-1'}>
								{LOGO_FORMATS.map(({label, file}) => (
									<button
										key={file}
										type={'button'}
										onClick={() => setSelectedFile(file)}
										disabled={selectedFile === file}
										className={
											'w-fit rounded-sm bg-subtle px-1 py-px text-white text-xxs leading-[14px] transition-colors disabled:bg-primary'
										}>
										{label}
									</button>
								))}
							</div>
						</div>
						<div className={'flex gap-2 font-mono'}>
							<Button className={'w-full uppercase'} variant={'outline'} onClick={handleCopyAddress}>
								{'Copy Address'}
							</Button>
							<Button className={'w-full uppercase'} variant={'outline'} onClick={handleCopyLogo}>
								{'Copy Logo URL'}
							</Button>
						</div>
						<div className={'space-y-6'}>
							<div className={'grid grid-cols-2 gap-x-4 gap-y-6'}>
								{token.name && <InfoField label={'NAME'} value={token.name} />}
								{token.symbol && <InfoField label={'SYMBOL'} value={token.symbol} />}
								{token.decimals !== undefined && (
									<InfoField label={'DECIMALS'} value={token.decimals.toString()} />
								)}
								<InfoField label={'NETWORK'} value={chain.name} />
							</div>
							<InfoField
								label={'CONTRACT ADDRESS'}
								value={token.address}
								href={explorerAddressURI(chain, token.address)}
							/>

							<div className={'space-y-2'}>
								<p className={'font-mono text-subtle text-xs uppercase tracking-[0.1em]'}>{'Use it'}</p>
								<CodeSnippets url={selectedURL} alt={`${displayName} logo`} />
							</div>

							<Link
								className={'flex w-full'}
								href={tokenGithubURI(chain.id, token.address)}
								target={'_blank'}
								rel={'noopener noreferrer'}>
								<Button className={'w-full'} variant={'default'}>
									{'VIEW ON GITHUB'}
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</Fragment>
	);
}

export function TokenDrawerWrapper({token, onClose, isOpen}: TTokenDrawerProps): ReactElement | null {
	return (
		<Drawer
			modal={true}
			direction={'right'}
			open={isOpen}
			onOpenChange={open => {
				if (!open) {
					onClose();
				}
			}}>
			<DrawerContent
				side={'right'}
				className={
					'inset-y-2 right-2 h-auto overflow-hidden rounded-[4px] border border-subtle bg-white p-0 max-md:left-2 md:w-[550px]'
				}>
				{token ? (
					<TokenDrawer token={token} onClose={onClose} />
				) : (
					<div className={'flex h-[400px] w-full items-center justify-center'}>
						<DrawerTitle className={'sr-only'}>{'Loading...'}</DrawerTitle>
						<Spinner />
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
}
