import fs from 'fs-extra';
import path from 'path';
import {ForbiddenSVGPattern} from './forbidden-svg-pattern.mjs';

const DataDirectory = './tokens';
const IndexName = 'index.json';
const SolanaChainDirectory = 'tokens/1151111081099710/';
const AllowedTokenFiles = new Set([
	'logo.svg',
	'logo-32.png',
	'logo-128.png',
	'logo-alt.svg',
	'logo-alt-32.png',
	'logo-alt-128.png',
	'info.json'
]);

const AllowedInfoKeys = new Set(['name', 'symbol', 'decimals', 'description', 'website', 'tags']);

const Base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(value) {
	const bytes = [];
	for (const char of value) {
		let carry = Base58Alphabet.indexOf(char);
		if (carry === -1) {
			return null;
		}
		for (let j = 0; j < bytes.length; j++) {
			carry += bytes[j] * 58;
			bytes[j] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			bytes.push(carry & 0xff);
			carry >>= 8;
		}
	}
	for (let i = 0; i < value.length && value[i] === '1'; i++) {
		bytes.push(0);
	}
	return bytes;
}

// A valid Solana mint folder decodes from base58 to a 32-byte pubkey; base58 is case-sensitive,
// so a lowercased/corrupted name (e.g. an out-of-alphabet 'l') is rejected.
function isValidSolanaAddress(value) {
	return base58Decode(value)?.length === 32;
}

// info.json schema: name/symbol (non-empty strings) and decimals (non-negative int) are required;
// description/website (strings) and tags (string[]) are optional; unknown fields are rejected.
function validateInfoJson(file) {
	const infoPath = path.join(file, 'info.json');
	if (!fs.existsSync(infoPath)) {
		return true;
	}
	let info;
	try {
		info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
	} catch (error) {
		console.error(`Error: "${infoPath}" is not valid JSON.`);
		return false;
	}
	let valid = true;
	if (typeof info.name !== 'string' || info.name.length === 0) {
		console.error(`Error: "${infoPath}" must have a non-empty string "name".`);
		valid = false;
	}
	if (typeof info.symbol !== 'string' || info.symbol.length === 0) {
		console.error(`Error: "${infoPath}" must have a non-empty string "symbol".`);
		valid = false;
	}
	if (!Number.isInteger(info.decimals) || info.decimals < 0) {
		console.error(`Error: "${infoPath}" must have a non-negative integer "decimals".`);
		valid = false;
	}
	if (info.description !== undefined && typeof info.description !== 'string') {
		console.error(`Error: "${infoPath}" "description" must be a string.`);
		valid = false;
	}
	if (info.website !== undefined && typeof info.website !== 'string') {
		console.error(`Error: "${infoPath}" "website" must be a string.`);
		valid = false;
	}
	if (info.tags !== undefined && (!Array.isArray(info.tags) || info.tags.some(tag => typeof tag !== 'string'))) {
		console.error(`Error: "${infoPath}" "tags" must be an array of strings.`);
		valid = false;
	}
	for (const key of Object.keys(info)) {
		if (!AllowedInfoKeys.has(key)) {
			console.error(`Error: "${infoPath}" has an unknown field "${key}". Allowed: ${[...AllowedInfoKeys].join(', ')}.`);
			valid = false;
		}
	}
	return valid;
}

function validate(directory) {
	let allValid = true;
	for (let name of fs.readdirSync(directory)) {
		if (name.startsWith('.') || name === IndexName || name === 'node_modules') continue;
		const file = path.join(directory, name);
		const stat = fs.lstatSync(file);
		if (stat.isDirectory()) {
			if (name.startsWith('0x')) {
				try {
					if (name.toLowerCase() !== name) {
						console.error(`Error: "${name}" is not lowercased. Should be "${name.toLowerCase()}".`);
						allValid = false;
					}
				} catch (error) {
					console.error(`Error: "${name}" is not lowercased. Should be "${name.toLowerCase()}".`);
					allValid = false;
				}
			}
			if (name.startsWith('_')) {
				continue;
			}
			if (name.startsWith('0x') || file.includes(SolanaChainDirectory)) {
				if (!name.startsWith('0x') && !isValidSolanaAddress(name)) {
					console.error(
						`Error: "${file}" folder name is not a valid base58 Solana address. Solana addresses are case-sensitive — a lowercased or corrupted mint is rejected.`
					);
					allValid = false;
				}
				if (!validateInfoJson(file)) {
					allValid = false;
				}
				if (!fs.existsSync(path.join(file, 'logo-128.png'))) {
					console.error(`Error: "${file}" is missing logo-128.png`);
					allValid = false;
				}
				if (!fs.existsSync(path.join(file, 'logo-32.png'))) {
					console.error(`Error: "${file}" is missing logo-32.png`);
					allValid = false;
				}
				if (!fs.existsSync(path.join(file, 'logo.svg'))) {
					console.error(`Error: "${file}" is missing logo.svg`);
					allValid = false;
				} else {
					const svgValue = fs.readFileSync(path.join(file, 'logo.svg'), 'utf8');
					if (ForbiddenSVGPattern.test(svgValue)) {
						console.error(`Error: "${file}" logo.svg contains a base64 image, external link or script.`);
						allValid = false;
					}
					// const fileSize = getFilesizeInBytes(path.join(file, 'logo.svg')) / 1000000;
					// if (fileSize > 0.15) {
					// 	console.error(`Error: "${file}" logo.svg is larger than 0.15mb.`);
					// 	allValid = false;
					// }
				}
				// Reject stray files: a token folder may only hold the logo set and info.json.
				for (const entry of fs.readdirSync(file, {withFileTypes: true})) {
					if (entry.isFile() && !entry.name.startsWith('.') && !AllowedTokenFiles.has(entry.name)) {
						console.error(
							`Error: "${path.join(file, entry.name)}" is not an allowed file. Token folders may only contain: ${[...AllowedTokenFiles].join(', ')}.`
						);
						allValid = false;
					}
				}
			}
			allValid &= validate(file);
		}
	}
	return allValid;
}

function verify(dataDir) {
	const valid = validate(dataDir);
	if (!valid) process.exit(1);
}

const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, '.git'))) {
	console.error('Error: script should be run in the root of the repo.');
	process.exit(1);
}

try {
	verify(DataDirectory);
	console.log('Ok: all files match schema definitions!');
} catch (error) {
	console.error(error);
	process.exit(1);
}
