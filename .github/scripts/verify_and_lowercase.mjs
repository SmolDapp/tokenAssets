import fs from "fs-extra";
import path from "path";

const DataDirectory = ".";
const IndexName = "index.json";

function validate(directory) {
	let allValid = true;
	for (let name of fs.readdirSync(directory)) {
		if (name.startsWith(".") || name === IndexName || name === 'node_modules') continue;
		let file = path.join(directory, name);
		const stat = fs.lstatSync(file);
		if (stat.isDirectory()) {
			if (name.startsWith("0x")) {
				try {
					if (name.toLowerCase() !== name) {
						console.error(`Error: "${name}" is not lowercased. Should be "${name.toLowerCase()}".`);
						allValid = false;
						const newName = name.toLowerCase();
						const newFile = path.join(directory, newName);
						if (fs.existsSync(newFile)) {
							console.log(`Deleting existing folder "${newName}"...`);
							fs.removeSync(newFile);
						}
						console.log(`Renaming folder "${name}" to "${newName}"...`);
						fs.renameSync(file, newFile);
						name = newName; // Update the name variable to the new lowercase name
						file = newFile; // Update the file variable to the new folder path
					}
				} catch(error) {
					console.error(`Error: "${name}" is not lowercased. Should be "${name.toLowerCase()}".`);
					allValid = false;
				}
			}
			if (name.startsWith("_")) {
				continue;
			}

			allValid &= validate(file);

			if (name.startsWith("0x")) {
				if (!fs.existsSync(path.join(file, "logo-128.png"))) {
					console.error(`Error: "${file}" is missing logo-128.png`);
					allValid = false;
				}
				if (!fs.existsSync(path.join(file, "logo-32.png"))) {
					console.error(`Error: "${file}" is missing logo-32.png`);
					allValid = false;
				}
				if (!fs.existsSync(path.join(file, "logo.svg"))) {
					console.error(`Error: "${file}" is missing logo.svg`);
					allValid = false;
				}
			}
		}
	}
	return allValid;
}

function verify(dataDir) {
	const valid = validate(dataDir);
	if (!valid)
		process.exit(1);
}

const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, ".git"))) {
	console.error("Error: script should be run in the root of the repo.");
	process.exit(1);
}

try {
	verify(DataDirectory);
	console.log("Ok: all files match schema definitions!");
} catch (error) {
	console.error(error);
	process.exit(1);
}
