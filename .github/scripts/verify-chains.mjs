import fs from 'fs-extra';
import path from 'path';
import {ForbiddenSVGPattern} from './forbidden-svg-pattern.mjs';

const DataDirectory = './chains';
const IndexName = 'index.json';
const AllowedChainFiles = new Set([
	'logo.svg',
	'logo-32.png',
	'logo-128.png',
	'logo-alt.svg',
	'logo-alt-32.png',
	'logo-alt-128.png'
]);

function validate(directory) {
	let allValid = true;
	for (let name of fs.readdirSync(directory)) {
		if (name.startsWith('.') || name === IndexName || name === 'node_modules') continue;
		const file = path.join(directory, name);
		const stat = fs.lstatSync(file);
		if (stat.isDirectory()) {
			if (name.startsWith('_')) {
				continue;
			}
			if (name.match(/^[a-zA-Z0-9]+$/) != null) {
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
				}
				// Reject stray files: a chain folder may only hold the logo set.
				for (const entry of fs.readdirSync(file, {withFileTypes: true})) {
					if (entry.isFile() && !entry.name.startsWith('.') && !AllowedChainFiles.has(entry.name)) {
						console.error(
							`Error: "${path.join(file, entry.name)}" is not an allowed file. Chain folders may only contain: ${[...AllowedChainFiles].join(', ')}.`
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
