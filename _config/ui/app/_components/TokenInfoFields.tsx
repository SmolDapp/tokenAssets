import {InfoField} from '@components/InfoField';
import {cn} from '@components/lib/utils';
import type {TChainInfo} from '@utils/constants';
import {explorerAddressURI} from '@utils/helpers';
import type {TToken} from '@utils/types';
import type {ReactElement} from 'react';

// The token metadata block (name / symbol / decimals / network + contract address) shared by the
// drawer overlay and the standalone token page. No hooks, so it renders in both server and client.
export function TokenInfoFields({
	token,
	chain,
	className,
	gridClassName
}: {
	token: TToken;
	chain: TChainInfo;
	className?: string;
	gridClassName?: string;
}): ReactElement {
	return (
		<div className={cn('space-y-6', className)}>
			<div className={cn('grid grid-cols-2 gap-x-4 gap-y-6', gridClassName)}>
				{token.name && <InfoField label={'NAME'} value={token.name} />}
				{token.symbol && <InfoField label={'SYMBOL'} value={token.symbol} />}
				{token.decimals !== undefined && <InfoField label={'DECIMALS'} value={token.decimals.toString()} />}
				<InfoField label={'NETWORK'} value={chain.name} />
			</div>
			<InfoField
				label={'CONTRACT ADDRESS'}
				value={token.address}
				href={explorerAddressURI(chain, token.address)}
			/>
		</div>
	);
}
