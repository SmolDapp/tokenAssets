import fs from 'fs-extra';
import path from 'path';

const DataDirectory = './tokens';
const IndexName = 'index.json';

function getFilesizeInBytes(filename) {
	var stats = fs.statSync(filename);
	var fileSizeInBytes = stats.size;
	return fileSizeInBytes;
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
			if (name.startsWith('0x') || file.includes('tokens/1151111081099710/')) {
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
					const svgValue = fs.readFileSync(path.join(file, 'logo.svg'));
					if (
						svgValue.includes(`data:image/png;base64`) ||
						svgValue.includes(`data:img/png;base64`) ||
						svgValue.includes(`data:image/jpeg;base64`) ||
						svgValue.includes(`data:img/jpeg;base64`)
					) {
						console.error(`Error: "${file}" logo.svg contains base64 encoded image.`);
						allValid = false;
					}
					// const fileSize = getFilesizeInBytes(path.join(file, 'logo.svg')) / 1000000;
					// if (fileSize > 0.15) {
					// 	console.error(`Error: "${file}" logo.svg is larger than 0.15mb.`);
					// 	allValid = false;
					// }

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
