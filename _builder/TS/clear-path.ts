import * as fs from 'fs';
import * as path from 'path';
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
	console.log('Clearing token folders for', args.company);

	const company = args.company;
	const companyTokensPath = path.join(__dirname, `/company/${company}/tokens.ts`);

	if (!fs.existsSync(companyTokensPath)) {
		console.error(`Tokens file not found for company: ${company}`);
		process.exit(1);
	}

	const tokenConfig = require(companyTokensPath);
	await clearTokenFolders(tokenConfig);
}

const clearTokenFolders = async (tokenConfig: {tokens: IToken[]}) => {
	const tokensDir = path.join(__dirname, '../../tokens');
	console.log(`Looking for token folders in: ${tokensDir}`);

	for (const token of tokenConfig.tokens) {
		const chainDir = path.join(tokensDir, token.chain.toString());
		const tokenDir = path.join(chainDir, token.address.length == 42 ? token.address.toLowerCase() : token.address);

		if (fs.existsSync(tokenDir)) {
			console.log(`Deleting folder: ${tokenDir}`);
			fs.rmdirSync(tokenDir, {recursive: true});
			console.log(`✓ Folder deleted: ${tokenDir}`);
		} else {
			console.log(`Folder does not exist: ${tokenDir}`);
		}
	}

	console.log('All token folders cleared successfully.');
};

main(...process.argv.slice(2));
