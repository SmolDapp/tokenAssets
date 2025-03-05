import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {extname} from 'path';
import {trace} from 'potrace';
import sharp from 'sharp';
import {Argv} from './interfaces/Argv';
import {IToken} from './interfaces/IToken';

async function main(...argv: any[]) {
	let args: {[key in Argv]?: string} = {
		company: ''
	};
	for (let i = 0; i < argv.length - 1; i += 2) {
		if (argv[i].includes('--')) {
			args[argv[i].replace('--', '') as Argv] = argv[i + 1] ?? '';
		}
	}

	if (!args.company) {
		console.error('Please provide a company name using --company');
		process.exit(1);
	}
	console.log('Building', args.company);

	const company = args.company;
	const companyTokensPath = path.join(__dirname, `/company/${company}/tokens.ts`);

	if (!fs.existsSync(companyTokensPath)) {
		console.error(`Tokens file not found for company: ${company}`);
		process.exit(1);
	}

	const tokenConfig = require(companyTokensPath);
	// console.log(tokenConfig.tokens);

	await createTokenFolders(tokenConfig, company);
}

const createTokenFolders = async (tokenConfig: {tokens: IToken[]}, company: string) => {
	const tokensDir = path.join(__dirname, '../../tokens');
	console.log(tokensDir);

	for (const token of tokenConfig.tokens) {
		console.log('-'.repeat(80));

		const chainDir = path.join(tokensDir, token.chain.toString());
		const tokenDir = path.join(chainDir, token.address.length == 42 ? token.address.toLowerCase() : token.address);

		if (fs.existsSync(tokenDir)) {
			fs.rmSync(tokenDir, {recursive: true});
		}
		fs.mkdirSync(tokenDir, {recursive: true});

		const logoUrl_vector = token.logo;
		const logoUrl =
			token.logo.includes('sgUSD') || token.logo.includes('sgGOLD')
				? token.logo
				: token.logo.replace('_vector.svg', '.svg');
		console.log(logoUrl_vector);

		const logoExt = extname(logoUrl);

		const logoSvgPath = path.join(tokenDir, 'logo_temp.svg');
		const logoSvgPath_vector = path.join(tokenDir, 'logo.svg');
		const logo32Path = path.join(tokenDir, 'logo-32.png');
		const logo128Path = path.join(tokenDir, 'logo-128.png');

		try {
			const response_vector = await axios.get(logoUrl_vector, {responseType: 'arraybuffer'});
			console.log(`Original logo: ${logoSvgPath_vector}`);
			fs.writeFileSync(logoSvgPath_vector, response_vector.data);
			//
			const response = await axios.get(logoUrl, {responseType: 'arraybuffer'});
			fs.writeFileSync(logoSvgPath, response.data);
			// console.log(`Original logo: ${logoSvgPath}`);
			if (logoExt !== '.svg') {
				// Convert the original logo to PNG format
				await sharp(logoSvgPath).toFile(logoSvgPath);
				console.log(`Converted logo: ${logoSvgPath}`);
				await convertPngToSvgAndResize(logoSvgPath, logoSvgPath, logo32Path, logo128Path);
				// Delete the original SVG file after converting
			}

			//
			// Save the resized logos
			await sharp(logoSvgPath).resize(128, 128).toFile(logo128Path);
			console.log(`128px logo: ${logo128Path}`);
			await sharp(logoSvgPath).resize(32, 32).toFile(logo32Path);
			console.log(`32px logo: ${logo32Path}`);
			//delete original svg
			fs.unlinkSync(logoSvgPath);
			console.log(`Deleted original SVG file: ${logoSvgPath}`);
			console.log('-'.repeat(80));
		} catch (error) {
			console.error(`Failed to download or process logo from URL: ${logoUrl}`, error);
		}
	}
};

const convertPngToSvgAndResize = async (
	logoPngPath: string,
	logoSvgPath: string,
	logo32Path: string,
	logo128Path: string
) => {
	if (extname(logoPngPath) !== '.svg') {
		// Convert PNG to SVG using potrace
		await new Promise<void>((resolve, reject) => {
			trace(logoPngPath, (err, svg) => {
				if (err) {
					reject(err);
				} else {
					fs.writeFileSync(logoSvgPath, svg);
					console.log(`Converted PNG to SVG at ${logoSvgPath}`);
					resolve();
				}
			});
		});
	}

	// Resize the PNG to 128x128 and 32x32
	await sharp(logoPngPath).resize(128, 128).toFile(logo128Path);
	console.log(`Resized PNG to 128x128 at ${logo128Path}`);
	await sharp(logoPngPath).resize(32, 32).toFile(logo32Path);
	console.log(`Resized PNG to 32x32 at ${logo32Path}`);
};

main(...process.argv.slice(2));
