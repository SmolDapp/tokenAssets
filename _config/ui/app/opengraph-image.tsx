import {BRAND_EYES_DATA_URI} from '@utils/brandMark';
import {BRAND_GREEN, CHAINS, TOTAL_TOKENS} from '@utils/constants';
import {ImageResponse} from 'next/og';

export const size = {width: 1200, height: 630};
export const contentType = 'image/png';
export const alt = 'Token Assets — one CDN for every token';

export default function OpengraphImage(): ImageResponse {
	return new ImageResponse(
		<div
			style={{
				height: '100%',
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				background: BRAND_GREEN,
				padding: '80px',
				fontFamily: 'monospace'
			}}>
			<div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
				<div
					style={{
						display: 'flex',
						padding: '20px 24px',
						borderRadius: 14,
						border: '1px solid rgba(255,255,255,0.4)'
					}}>
					{/* biome-ignore lint/a11y/useAltText: decorative brand mark */}
					{/* biome-ignore lint/performance/noImgElement: next/og renders via Satori, which only supports raw <img>. */}
					<img src={BRAND_EYES_DATA_URI} width={132} height={57} />
				</div>
				<div style={{display: 'flex', color: '#ffffff', fontSize: 32, letterSpacing: 6}}>{'TOKEN ASSETS'}</div>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					color: '#ffffff',
					textTransform: 'uppercase'
				}}>
				<div style={{display: 'flex', fontSize: 100, fontWeight: 700, lineHeight: 1.05}}>{'One CDN for'}</div>
				<div style={{display: 'flex', fontSize: 100, fontWeight: 700, lineHeight: 1.05}}>{'every token'}</div>
			</div>
			<div style={{display: 'flex', color: 'rgba(255,255,255,0.55)', fontSize: 30}}>
				{`${TOTAL_TOKENS.toLocaleString('en-US')} tokens · ${
					CHAINS.length
				} chains · SVG & PNG · assets.smold.app`}
			</div>
		</div>,
		size
	);
}
