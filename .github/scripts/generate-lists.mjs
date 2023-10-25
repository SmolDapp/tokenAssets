import fs from "fs-extra";
import path from "path";
import createKeccakHash from 'keccak'

const DataDirectory = "./tokens";
const IndexName = "list.json";

function toChecksumAddress(address) {
	address = address.toLowerCase().replace('0x', '')
	var hash = createKeccakHash('keccak256').update(address).digest('hex')
	var ret = '0x'

	for (var i = 0; i < address.length; i++) {
		if (parseInt(hash[i], 16) >= 8) {
			ret += address[i].toUpperCase()
		} else {
			ret += address[i]
		}
	}

	return ret
}

const perChain = {};
function generate(directory) {
	for (let name of fs.readdirSync(directory)) {
		if (name.startsWith(".") || name === IndexName || name === 'node_modules') continue;
		const file = path.join(directory, name);
		const stat = fs.lstatSync(file);
		if (stat.isDirectory()) {
			if (name.startsWith("0x")) {
				const currentChain = Number(directory.split("/").pop());
				if (perChain[currentChain] === undefined) {
					perChain[currentChain] = [];
				}
				perChain[currentChain].push(toChecksumAddress(name));
			}
			generate(file);
		}
	}
}

const cwd = process.cwd();
if (!fs.existsSync(path.join(cwd, ".git"))) {
	console.error("Error: script should be run in the root of the repo.");
	process.exit(1);
}

try {
	generate(DataDirectory);
	for (const chain in perChain) {
		fs.writeFileSync(path.join(DataDirectory, chain, IndexName), JSON.stringify(perChain[chain], null, 4));
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
