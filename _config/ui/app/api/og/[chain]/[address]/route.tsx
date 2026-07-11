import {findChainBySlug} from '@utils/constants';
import {tokenLogoURI, truncateAddress} from '@utils/helpers';
import {findToken} from '@utils/tokens.server';
import {ImageResponse} from 'next/og';

export async function GET(
	_request: Request,
	{params}: {params: Promise<{chain: string; address: string}>}
): Promise<ImageResponse> {
	const {chain: chainSlug, address} = await params;
	const chain = findChainBySlug(chainSlug);
	let found: ReturnType<typeof findToken>;
	if (chain) {
		found = findToken(chain.id, address);
	}
	const label = found?.symbol || truncateAddress(address, 6);
	const logoChainID = chain?.id || '1';

	return new ImageResponse(
		<div
			style={{
				height: '100%',
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				background: '#123524',
				padding: '72px',
				fontFamily: 'monospace'
			}}>
			<div style={{display: 'flex', color: 'rgba(255,255,255,0.6)', fontSize: 26, letterSpacing: 4}}>
				TOKEN ASSETS
			</div>
			<div style={{display: 'flex', alignItems: 'center', gap: '48px'}}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 220,
						height: 220,
						borderRadius: 9999,
						background: '#ffffff'
					}}>
					{/* biome-ignore lint/a11y/useAltText: decorative OG image */}
					{/* biome-ignore lint/performance/noImgElement: next/og renders via Satori, which only supports raw <img>. */}
					<img src={tokenLogoURI(logoChainID, address)} width={200} height={200} />
				</div>
				<div style={{display: 'flex', flexDirection: 'column'}}>
					<div style={{display: 'flex', color: '#ffffff', fontSize: 88, fontWeight: 700}}>{label}</div>
					{found?.name && (
						<div style={{display: 'flex', color: 'rgba(255,255,255,0.65)', fontSize: 34, marginTop: 8}}>
							{found.name}
						</div>
					)}
				</div>
			</div>
			<div style={{display: 'flex', color: 'rgba(255,255,255,0.55)', fontSize: 28}}>
				{`${chain?.name || 'Unknown'} · SVG & PNG · assets.smold.app`}
			</div>
		</div>,
		{width: 1200, height: 630}
	);
}
