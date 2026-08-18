'use client';

import {CodeSnippets} from '@components/CodeSnippets';
import {toast} from '@components/hooks/use-toast';
import {cn} from '@components/lib/utils';
import {Spinner} from '@components/Spinner';
import {TokenInfoFields} from '@components/TokenInfoFields';
import {Button} from '@components/ui/button';
import {Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle} from '@components/ui/drawer';
import {useChain} from '@contexts/WithChain';
import Cross from '@icons/cross.svg';
import {copyToClipboard} from '@utils/clipboard';
import {LOGO_FORMATS} from '@utils/constants';
import {tokenGithubURI, tokenLogoURI} from '@utils/helpers';
import type {TLogoFile, TToken} from '@utils/types';
import Image from 'next/image';
import Link from 'next/link';
import type {ReactElement} from 'react';
import {Fragment, useState} from 'react';

type TTokenDrawerProps = {
	token: TToken | null;
	onClose: () => void;
	isOpen: boolean;
	// Rendered instead of the loading spinner when the token list has finished loading but the
	// requested token is not in it — without this a bad address would spin forever.
	emptyState?: ReactElement;
};

function TokenDrawer({token}: {token: TToken}): ReactElement {
	const {chain} = useChain();
	const [selectedFile, setSelectedFile] = useState<TLogoFile>('logo.svg');
	const displayName = token.symbol || token.name || token.address;
	const selectedURL = tokenLogoURI(chain.id, token.address, selectedFile);

	const handleCopyAddress = async (): Promise<void> => {
		await copyToClipboard(token.address, 'Contract address copied to clipboard');
	};

	const handleCopyURL = async (): Promise<void> => {
		await copyToClipboard(selectedURL, 'Logo URL copied to clipboard');
	};

	// Copies the SVG markup itself, not its URL — the shape a design tool or a component file wants.
	// Always the vector, whichever format the preview is on. The CDN answers with a wildcard CORS
	// header (including across its redirect), so the file is readable from the browser.
	//
	// `reload` skips the HTTP cache on purpose. The preview <img> above requests this very URL in
	// no-cors mode, and the entry it leaves behind hides the CORS headers from a later cors-mode
	// fetch — which fails the copy with a bogus "no Access-Control-Allow-Origin" once the image
	// wins the race. Going to the network sidesteps that entry and overwrites it with a clean one.
	const handleCopySVG = async (): Promise<void> => {
		try {
			const response = await fetch(tokenLogoURI(chain.id, token.address, 'logo.svg'), {cache: 'reload'});
			if (!response.ok) {
				throw new Error(`Unexpected status ${response.status}`);
			}
			await copyToClipboard(await response.text(), 'SVG copied to clipboard');
		} catch {
			toast({title: 'Could not fetch the SVG', variant: 'destructive'});
		}
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
						<DrawerClose asChild>
							<Button
								aria-label={'Close'}
								className={'text-black'}
								variant={'ghost'}
								size={'icon'}>
								<Cross
									aria-hidden={'true'}
									className={'size-4'}
								/>
							</Button>
						</DrawerClose>
					</DrawerHeader>

					<div className={'flex flex-col gap-6'}>
						<div
							className={cn(
								'flex h-[160px] items-center justify-center bg-separator',
								'[background-image:radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:12px_12px]',
								'relative'
							)}>
							<div className={'size-28 rounded-full'}>
								{/* The drawer only ever renders opened, so this preview is always above the fold —
								    and on a direct hit to a token URL it is the LCP element. Lazy by default,
								    which delays it; priority makes it eager and high-fetchPriority. */}
								<Image
									unoptimized
									priority
									src={selectedURL}
									alt={displayName}
									className={'size-28 object-contain'}
									width={112}
									height={112}
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
										aria-pressed={selectedFile === file}
										className={cn(
											'w-fit rounded-sm px-1 py-px text-white text-xxs leading-[14px] transition-colors',
											selectedFile === file ? 'bg-primary' : 'bg-black/60 hover:bg-black/80'
										)}>
										{label}
									</button>
								))}
							</div>
						</div>
						{/* Three nowrap buttons do not fit side by side on a phone, so the third wraps to its
						    own full-width row below the narrow breakpoint. */}
						<div className={'grid grid-cols-2 gap-2 font-mono md:grid-cols-3'}>
							<Button
								className={'w-full uppercase'}
								variant={'outline'}
								onClick={handleCopyAddress}>
								{'Copy Address'}
							</Button>
							<Button
								className={'w-full uppercase'}
								variant={'outline'}
								onClick={handleCopyURL}>
								{'Copy URL'}
							</Button>
							<Button
								className={'w-full uppercase max-md:col-span-2'}
								variant={'outline'}
								onClick={handleCopySVG}>
								{'Copy as SVG'}
							</Button>
						</div>
						<div className={'space-y-6'}>
							<TokenInfoFields
								token={token}
								chain={chain}
							/>

							<div className={'space-y-2'}>
								<p className={'font-mono text-subtle text-xs uppercase tracking-[0.1em]'}>{'Use it'}</p>
								<CodeSnippets
									url={selectedURL}
									alt={`${displayName} logo`}
								/>
							</div>

							<Link
								className={'flex w-full'}
								href={tokenGithubURI(chain.id, token.address)}
								target={'_blank'}
								rel={'noopener noreferrer'}>
								<Button
									className={'w-full'}
									variant={'default'}>
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

export function TokenDrawerWrapper({token, onClose, isOpen, emptyState}: TTokenDrawerProps): ReactElement | null {
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
					<TokenDrawer token={token} />
				) : (
					emptyState ?? (
						<div className={'flex h-[400px] w-full items-center justify-center'}>
							<DrawerTitle className={'sr-only'}>{'Loading...'}</DrawerTitle>
							<Spinner />
						</div>
					)
				)}
			</DrawerContent>
		</Drawer>
	);
}
