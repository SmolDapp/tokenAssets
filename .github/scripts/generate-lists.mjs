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
		//load the existing list
		const previousLists = fs.existsSync(path.join(DataDirectory, chain, IndexName)) ? JSON.parse(fs.readFileSync(path.join(DataDirectory, chain, IndexName))) : {};
		if (!previousLists.version) {
			previousLists.version = {
				'major': 0,
				'minor': 0,
				'patch': 0
			};
		}
		if (!previousLists.tokens) {
			previousLists.tokens = [];
		}
		const newList = {
			version: previousLists.version,
			tokens: perChain[chain]
		}
		//compare the new list with the old one
		if (JSON.stringify(previousLists.tokens) === JSON.stringify(newList.tokens)) {
			console.log(`No changes detected for chain ${chain}`);
		} else if (previousLists.tokens.length > newList.tokens.length) {
			// At least one token was removed
			newList.version.major = previousLists.version.major + 1;
			newList.version.minor = 0;
			newList.version.patch = 0;
		} else if (previousLists.tokens.length < newList.tokens.length) {
			// At least one token was added
			newList.version.major = previousLists.version.major;
			newList.version.minor = previousLists.version.minor + 1;
			newList.version.patch = 0;
		} else {
			// The list has the same length, but at least one token was changed. This should never happen somehown
			newList.version.major = previousLists.version.major;
			newList.version.minor = previousLists.version.minor;
			newList.version.patch = previousLists.version.patch + 1;
		}

		fs.writeFileSync(path.join(DataDirectory, chain, IndexName), JSON.stringify(newList, null, 4));
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
