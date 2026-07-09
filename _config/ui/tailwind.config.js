/* eslint-disable @typescript-eslint/explicit-function-return-type */
const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
	darkMode: ['class', 'class'],
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./icons/**/*.{js,jsx,ts,tsx}',
		'./pages/**/*.{js,jsx,ts,tsx}',
		'./components/**/*.{js,jsx,ts,tsx}',
		'./contexts/**/*.{js,jsx,ts,tsx}',
		'./primitives/**/*.{js,jsx,ts,tsx}',
		'./types/**/*.{js,jsx,ts,tsx}',
		'./utils/**/*.{js,jsx,ts,tsx}'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['var(--geist-mono-font)', 'Geist Mono', 'Roboto', ...defaultTheme.fontFamily.sans],
				mono: ['var(--geist-mono-font)', 'Geist Mono', ...defaultTheme.fontFamily.mono]
			},
			screens: {
				xl: '1440px'
			},
			height: {
				108: '432px',
				content: '656px',
				app: 'calc(100dvh - 80px)'
			},
			minHeight: {
				content: '656px',
				app: 'calc(100dvh - 80px)'
			},
			width: {
				22: '88px',
				108: '432px',
				123: '492px',
				inherit: 'inherit',
				sidebar: '280px',
				main: '1000px'
			},
			maxWidth: {
				22: '88px',
				108: '432px',
				123: '492px',
				'4xl': '888px',
				'5xl': '992px',
				'6xl': '1200px'
			},
			fontSize: {
				xxs: ['10px', '16px'],
				xs: ['12px', '16px'],
				sm: ['14px', '20px'],
				base: ['16px', '24px'],
				intermediate: ['18px', '24px'],
				lg: ['20px', '32px'],
				xl: ['24px', '32px'],
				'3xl': ['32px', '40px'],
				'4xl': ['40px', '48px']
			},
			gridTemplateColumns: {
				root: 'repeat(30, minmax(0, 1fr))'
			},
			gridColumn: {
				sidebar: 'span 7 / span 7',
				main: 'span 23 / span 23'
			},
			borderRadius: {
				'4xl': '40px',
				'5xl': '48px'
			},
			colors: {
				primary: '#123524',
				'primary-light': '#1C4F36',
				'primary-170': '#17422D',
				'primary-180': '#1C4F36',
				secondary: '#D9E8DE',
				subtle: '#B2B0AF',
				subtleAlt: '#e0dfdf',
				white: '#EBEBEB',
				separator: '#E6E6E6',
				black: '#1A1A1A',
				disabled: '#8FB49D',
				success: '#36B25F',
				warning: '#FF8000',
				error: '#FF0040',
				'error-light': '#FFB2CC',
				dash: '#DBD8D7',
				'light-gray': '#F0F0F0',
				'border-gray': '#CFE2D6',
				transparent: 'transparent'
			}
		},
		plugins: [
			require('@tailwindcss/forms'),
			require('@tailwindcss/typography'),
			require('tailwindcss-animate'),
			plugin(({addUtilities}) => {
				addUtilities({
					'.scrollbar-none': {
						'-ms-overflow-style': 'none',
						'scrollbar-width': 'none',
						'&::-webkit-scrollbar': {
							display: 'none'
						}
					}
				});
			})
		]
	}
};
