import fs from "fs-extra";
import path from "path";
import {getAddress} from "ethers";
const DataDirectory = "../../";
const IndexName = "index.json";

function validate(directory) {
	let allValid = true;
	for (let name of fs.readdirSync(directory)) {
		if (name.startsWith(".") || name === IndexName) continue;
		const file = path.join(directory, name);
		const stat = fs.lstatSync(file);
		if (stat.isDirectory()) {
			if (name.startsWith("0x")) {
				try {
					if (getAddress(name.toLowerCase()) !== name) {
						console.error(`Error: "${name}" is not checksummed. Should be "${getAddress(name.toLowerCase())}".`);
						allValid = false;
					}
				} catch(error) {
					console.error(`Error: "${name}" is not checksummed. Should be "${getAddress(name.toLowerCase())}".`);
					allValid = false;
				}
			}
			if (name.startsWith("_")) {
				continue
			}
			allValid &= validate(file);
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