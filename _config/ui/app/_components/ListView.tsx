'use client';

import {NewBadge} from '@components/NewBadge';
import {Spinner} from '@components/Spinner';
import {TokenLogo} from '@components/TokenLogo';
import {cn} from '@components/lib/utils';
import {useChain} from '@contexts/WithChain';
import {useIntersectionObserver} from '@hooks/useIntersectionObserver';
import DownloadIcon from '@icons/download.svg';
import {copyToClipboard} from '@utils/clipboard';
import {LOGO_FORMATS} from '@utils/constants';
import {downloadLogo} from '@utils/download';
import {isNewToken, tokenLogoURI} from '@utils/helpers';
import {useCallback} from 'react';

import type {TToken} from '@utils/types';
import type {ReactElement, ReactNode} from 'react';

type TProps = {
	tokens: TToken[];
	onClick: (address: string) => void;
	hasNextPage?: boolean;
	onLoadMore?: () => void;
};

const BASE_GRID_CLASSES = 'bg-light-gray grid items-center gap-4 border border-separator p-4';
const GRID_COLS = 'grid-cols-[48px_1fr_3fr_300px]';

function LogoActions({chainID, token}: {chainID: string; token: TToken}): ReactElement {
	return (
		<div className={'flex justify-end gap-2'}>
			{LOGO_FORMATS.map(({label, file}) => {
				const url = tokenLogoURI(chainID, token.address, file);
				return (
					<div key={file} className={'flex items-stretch rounded-sm border border-primary text-primary'}>
						<button
							type={'button'}
							title={`Copy ${label} link`}
							onClick={() => copyToClipboard(url, `${label} link copied to clipboard`)}
							className={'px-2 py-1 font-medium text-xxs uppercase transition-colors hover:bg-secondary'}>
							{label}
						</button>
						<span className={'w-px self-stretch bg-primary/30'} />
						<button
							type={'button'}
							title={`Download ${label}`}
							onClick={() => downloadLogo(url, `${token.symbol || token.address}-${file}`)}
							className={'flex items-center px-1.5 transition-colors hover:bg-secondary'}>
							<DownloadIcon className={'size-3'} />
						</button>
					</div>
				);
			})}
		</div>
	);
}

function ListOfTokens({tokens, onClick}: TProps): ReactNode {
	const {chain} = useChain();

	return tokens.map((token, index) => (
		<div key={token.address} className={cn(BASE_GRID_CLASSES, 'transition-colors hover:bg-separator', GRID_COLS)}>
			<button type={'button'} onClick={() => onClick(token.address)} className={'size-12 rounded-full'}>
				<TokenLogo
					token={token}
					chainID={chain.id}
					index={index}
					size={48}
					className={'size-12 object-contain'}
				/>
			</button>

			<button type={'button'} onClick={() => onClick(token.address)} className={'flex flex-col text-left'}>
				<span className={'flex items-center gap-2'}>
					<span className={'font-semibold text-sm hover:text-primary'}>{token.symbol || '—'}</span>
					{isNewToken(token.addedAt) && <NewBadge />}
				</span>
				<span className={'text-subtle text-xs'}>{token.name || ''}</span>
			</button>

			<div className={'break-all font-mono text-sm'}>{token.address}</div>

			<LogoActions chainID={chain.id} token={token} />
		</div>
	));
}

export const ListView = ({tokens, onClick, hasNextPage, onLoadMore}: TProps): ReactElement => {
	const loadMoreRef = useIntersectionObserver(
		useCallback(() => {
			if (hasNextPage && onLoadMore) {
				onLoadMore();
			}
		}, [hasNextPage, onLoadMore])
	);

	return (
		<div className={'relative w-full'}>
			<div className={cn(BASE_GRID_CLASSES, 'text-subtle text-xs', GRID_COLS)}>
				<div />
				<span>{'NAME'}</span>
				<span>{'CONTRACT ADDRESS'}</span>
				<span className={'text-right'}>{'COPY LINK / DOWNLOAD'}</span>
			</div>

			<div className={'flex flex-col'}>
				<ListOfTokens tokens={tokens} onClick={onClick} />
			</div>
			{hasNextPage && (
				<div className={'my-16 flex w-full items-center justify-center'} ref={loadMoreRef}>
					<Spinner />
				</div>
			)}
		</div>
	);
};
