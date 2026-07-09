'use client';

import {copyToClipboard} from '@utils/clipboard';

import type {ReactElement} from 'react';

function buildSnippets(url: string, alt: string): {label: string; code: string}[] {
	return [
		{label: 'URL', code: url},
		{label: 'HTML', code: `<img src="${url}" alt="${alt}" width="48" height="48" />`},
		{label: 'Markdown', code: `![${alt}](${url})`},
		{label: 'JSX', code: `<img src="${url}" alt="${alt}" width={48} height={48} />`},
		{label: 'CSS', code: `background-image: url("${url}");`}
	];
}

export function CodeSnippets({url, alt}: {url: string; alt: string}): ReactElement {
	return (
		<div className={'flex flex-col gap-2'}>
			{buildSnippets(url, alt).map(({label, code}) => (
				<div key={label} className={'flex items-stretch overflow-hidden rounded-sm border border-separator'}>
					<span
						className={
							'flex w-[84px] shrink-0 items-center bg-separator px-3 font-mono text-subtle text-xxs uppercase tracking-[0.08em]'
						}>
						{label}
					</span>
					<code className={'flex-1 truncate bg-light-gray px-3 py-2.5 font-mono text-black text-xs'}>
						{code}
					</code>
					<button
						type={'button'}
						title={`Copy ${label}`}
						onClick={() => copyToClipboard(code, `${label} snippet copied to clipboard`)}
						className={
							'shrink-0 border-separator border-l bg-light-gray px-3 font-mono text-primary text-xxs uppercase tracking-[0.1em] transition-colors hover:bg-primary hover:text-white'
						}>
						{'Copy'}
					</button>
				</div>
			))}
		</div>
	);
}
