import {BRAND_EYES_DATA_URI} from '@utils/brandMark';
import {BRAND_GREEN} from '@utils/constants';
import {ImageResponse} from 'next/og';

export const size = {width: 180, height: 180};
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
	return new ImageResponse(
		<div
			style={{
				height: '100%',
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: BRAND_GREEN
			}}>
			{/* biome-ignore lint/a11y/useAltText: decorative icon */}
			{/* biome-ignore lint/performance/noImgElement: next/og renders via Satori, which only supports raw <img>. */}
			<img src={BRAND_EYES_DATA_URI} width={120} height={51} />
		</div>,
		size
	);
}
