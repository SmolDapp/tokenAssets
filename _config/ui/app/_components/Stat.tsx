import type {ReactElement} from 'react';

export function Stat({value, label}: {value: string; label: string}): ReactElement {
	return (
		<div className={'flex flex-col gap-1'}>
			<span className={'font-medium font-mono text-2xl text-white leading-none md:text-4xl'}>{value}</span>
			<span className={'font-mono text-[11px] text-white/45 uppercase tracking-[0.14em]'}>{label}</span>
		</div>
	);
}
