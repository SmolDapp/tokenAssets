import {ChainLogo} from '@components/ChainLogo';
import {cn} from '@components/lib/utils';

import type {TChainInfo} from '@utils/constants';
import type {ReactElement} from 'react';

type TSubmitPreviewProps = {
	chain: TChainInfo;
	address: string;
	svgDataURL: string | null;
	name: string;
	symbol: string;
	decimals: string;
};

function fallback(value: string): string {
	if (value.trim()) {
		return value.trim();
	}
	return '—';
}

function PreviewField({label, value}: {label: string; value: string}): ReactElement {
	return (
		<div className={'space-y-1'}>
			<p className={'font-mono text-black/55 text-xs uppercase tracking-[0.06em]'}>{label}</p>
			<p className={'break-all font-mono text-black text-sm'}>{value}</p>
		</div>
	);
}

export function SubmitPreview({chain, address, svgDataURL, name, symbol, decimals}: TSubmitPreviewProps): ReactElement {
	return (
		<div className={'space-y-6 rounded-sm border border-separator bg-light-gray p-6'}>
			<p className={'font-medium font-mono text-black/70 text-xs uppercase tracking-[0.1em]'}>{'Preview'}</p>

			<div className={'flex items-center gap-4'}>
				<div
					className={cn(
						'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full',
						'border border-separator bg-[#ffffff]'
					)}>
					{svgDataURL && (
						<img
							src={svgDataURL}
							alt={`${fallback(symbol)} logo preview`}
							className={'size-16 object-contain'}
						/>
					)}
					{!svgDataURL && <span className={'font-mono text-[10px] text-black/40 uppercase'}>{'SVG'}</span>}
				</div>
				<div className={'min-w-0'}>
					<p className={'truncate font-medium font-mono text-2xl text-black'}>{fallback(symbol)}</p>
					<p className={'truncate font-mono text-black/55 text-sm'}>{fallback(name)}</p>
				</div>
			</div>

			<div className={'grid grid-cols-2 gap-4'}>
				<PreviewField label={'Symbol'} value={fallback(symbol)} />
				<PreviewField label={'Decimals'} value={fallback(decimals)} />
				<div className={'space-y-1'}>
					<p className={'font-mono text-black/55 text-xs uppercase tracking-[0.06em]'}>{'Network'}</p>
					<span className={'flex items-center gap-2 font-mono text-black text-sm'}>
						<ChainLogo id={chain.id} />
						{chain.name}
					</span>
				</div>
				<PreviewField label={'Chain ID'} value={chain.id} />
			</div>

			<PreviewField label={'Contract'} value={fallback(address)} />
		</div>
	);
}
