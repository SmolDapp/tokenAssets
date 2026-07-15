'use client';

import {cn} from '@components/lib/utils';
import {NewBadge} from '@components/NewBadge';
import {Spinner} from '@components/Spinner';
import {TokenLogo} from '@components/TokenLogo';
import {useChain} from '@contexts/WithChain';
import {useIntersectionObserver} from '@hooks/useIntersectionObserver';
import {isNewToken, truncateAddress} from '@utils/helpers';
import type {TToken} from '@utils/types';
import type {ReactElement, ReactNode, RefObject} from 'react';
import {memo, useCallback, useMemo, useRef} from 'react';
import {useResizeObserver} from 'usehooks-ts';

type TProps = {
	tokens: TToken[];
	onClick: (address: string) => void;
	hasNextPage?: boolean;
	onLoadMore?: () => void;
};

const BASE_CARD_CLASSES =
	'group relative flex flex-col items-center justify-around p-3 transition-all h-[200px] w-fit flex-1';
const CARD_SIZING = 'max-md:w-full md:min-w-[200px]';

const TokenCard = memo(function TokenCard({
	token,
	chainID,
	index,
	isNew,
	onClick
}: {
	token: TToken;
	chainID: string;
	index: number;
	isNew: boolean;
	onClick: (address: string) => void;
}): ReactElement {
	return (
		<button
			type={'button'}
			onClick={() => onClick(token.address)}
			className={cn(
				BASE_CARD_CLASSES,
				CARD_SIZING,
				'cursor-pointer border border-separator bg-light-gray hover:bg-primary'
			)}>
			{isNew && <NewBadge className={'absolute top-2 right-2 group-hover:bg-white group-hover:text-primary'} />}
			<div className={'relative flex items-center justify-center pt-[34px] pb-[32px]'}>
				<div className={'size-14 rounded-full'}>
					<TokenLogo
						token={token}
						chainID={chainID}
						index={index}
						size={56}
						className={'outlined size-14 transition-all group-hover:scale-120'}
					/>
				</div>
			</div>
			<div className={'flex w-full flex-col text-left'}>
				<span className={'truncate font-medium text-base text-black group-hover:text-white'}>
					{token.symbol || truncateAddress(token.address, 4)}
				</span>
				<span className={'truncate font-medium text-subtle text-xs group-hover:text-white'}>
					{token.name || truncateAddress(token.address)}
				</span>
			</div>
		</button>
	);
});

function TokenGrid({tokens, onClick}: TProps): ReactNode {
	const {chain} = useChain();

	// Memoized so the frequent resize-observer re-renders of GridView do not re-map every
	// token (and re-run isNewToken) on each tick — the mapping only depends on these.
	return useMemo(
		() =>
			tokens.map((token, index) => (
				<TokenCard
					key={token.address}
					token={token}
					chainID={chain.id}
					index={index}
					isNew={isNewToken(token.addedAt)}
					onClick={onClick}
				/>
			)),
		[tokens, chain.id, onClick]
	);
}

export const GridView = ({tokens, onClick, hasNextPage, onLoadMore}: TProps): ReactElement => {
	const gridRef = useRef<HTMLDivElement>(null);
	const {width = 0} = useResizeObserver({ref: gridRef as RefObject<HTMLDivElement>, box: 'border-box'});
	const tokensPerLine = Math.floor(width / 200) || 1;
	const missingElements = (tokensPerLine - (tokens.length % tokensPerLine)) % tokensPerLine;
	const newElements = useMemo(() => {
		return Array.from({length: missingElements}).map((_, index) => (
			<div
				// biome-ignore lint/suspicious/noArrayIndexKey: Unique key from length
				key={`missing-element-${index}`}
				className={cn(BASE_CARD_CLASSES, 'pointer-events-none invisible min-w-[200px] border')}
			/>
		));
	}, [missingElements]);

	const loadMoreRef = useIntersectionObserver(
		useCallback(() => {
			if (hasNextPage && onLoadMore) {
				onLoadMore();
			}
		}, [hasNextPage, onLoadMore])
	);

	return (
		<div
			ref={gridRef}
			className={'flex grid-cols-2 flex-row flex-wrap gap-0 px-0.5 max-md:grid'}>
			<TokenGrid
				tokens={tokens}
				onClick={onClick}
			/>
			{newElements}
			{hasNextPage && (
				<div
					className={'my-16 flex w-full items-center justify-center'}
					ref={loadMoreRef}>
					<Spinner />
				</div>
			)}
		</div>
	);
};
