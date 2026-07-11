import {CodeSnippets} from '@components/CodeSnippets';
import {InfoField} from '@components/InfoField';
import {TokenInfoFields} from '@components/TokenInfoFields';
import {findChainBySlug, LOGO_FORMATS} from '@utils/constants';
import {tokenGithubURI, tokenLogoURI, tokenPageURI, truncateAddress} from '@utils/helpers';
import {findToken} from '@utils/tokens.server';
import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {ReactElement} from 'react';

type TTokenPageProps = {
	params: Promise<{chain: string; address: string}>;
};

export async function generateMetadata({params}: TTokenPageProps): Promise<Metadata> {
	const {chain: chainSlug, address} = await params;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		return {};
	}
	const token = findToken(chain.id, address);
	if (!token) {
		return {};
	}

	const label = token.symbol || truncateAddress(token.address, 6);
	let named = '';
	if (token.name) {
		named = ` (${token.name})`;
	}
	const title = `${label}${named} logo on ${chain.name} | Token Assets`;
	const description = `Download the ${label} token logo on ${chain.name} as SVG or PNG from the Token Assets CDN — free, no API key.`;
	const url = tokenPageURI(chain.slug, token.address);
	const image = `/api/og/${chain.slug}/${token.address}`;
	return {
		title,
		description,
		alternates: {canonical: url},
		openGraph: {title, description, url, type: 'website', images: [{url: image, width: 1200, height: 630}]},
		twitter: {card: 'summary_large_image', title, description, images: [image]}
	};
}

export default async function TokenPage({params}: TTokenPageProps): Promise<ReactElement> {
	const {chain: chainSlug, address} = await params;
	const chain = findChainBySlug(chainSlug);
	if (!chain) {
		notFound();
	}
	const token = findToken(chain.id, address);
	if (!token) {
		notFound();
	}

	const label = token.symbol || truncateAddress(token.address, 6);
	const displayName = token.name || label;
	const svgURL = tokenLogoURI(chain.id, token.address, 'logo.svg');

	return (
		<div className={'mx-auto w-full max-w-4xl px-4 py-10 md:py-16'}>
			<Link
				href={`/${chain.slug}`}
				className={
					'inline-flex items-center gap-2 font-mono text-subtle text-xs uppercase tracking-[0.08em] transition-colors hover:text-primary'
				}>
				{`← All token logos on ${chain.name}`}
			</Link>

			<div className={'mt-6 flex flex-col gap-6 md:flex-row md:items-center'}>
				<div
					className={
						'flex size-40 shrink-0 items-center justify-center bg-separator [background-image:radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:12px_12px]'
					}>
					<Image
						priority
						unoptimized
						src={svgURL}
						alt={`${displayName} logo`}
						width={112}
						height={112}
						className={'size-28 object-contain'}
					/>
				</div>
				<div className={'flex flex-col gap-2'}>
					<h1 className={'font-bold text-3xl text-black md:text-4xl'}>{`${label} logo on ${chain.name}`}</h1>
					<p className={'font-mono text-sm text-subtle'}>
						{`Download the ${displayName} token logo as SVG or PNG — free, no API key.`}
					</p>
				</div>
			</div>

			<TokenInfoFields token={token} chain={chain} className={'mt-10'} gridClassName={'md:grid-cols-4'} />

			<section className={'mt-10 space-y-3'}>
				<h2 className={'font-mono text-subtle text-xs uppercase tracking-[0.1em]'}>{'Direct CDN URLs'}</h2>
				<div className={'space-y-3'}>
					{LOGO_FORMATS.map(({label: formatLabel, file}) => (
						<InfoField key={file} label={formatLabel} value={tokenLogoURI(chain.id, token.address, file)} />
					))}
				</div>
			</section>

			<section className={'mt-10 space-y-3'}>
				<h2 className={'font-mono text-subtle text-xs uppercase tracking-[0.1em]'}>{'Embed it'}</h2>
				<CodeSnippets url={svgURL} alt={`${displayName} logo`} />
			</section>

			<Link
				href={tokenGithubURI(chain.id, token.address)}
				target={'_blank'}
				rel={'noopener noreferrer'}
				className={
					'mt-10 inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 font-medium font-mono text-white text-xs uppercase tracking-[0.08em] transition-colors hover:bg-primary-light'
				}>
				{'View on GitHub'}
			</Link>
		</div>
	);
}
