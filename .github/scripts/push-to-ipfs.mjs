import {FleekSdk, PersonalAccessTokenService} from '@fleekxyz/sdk';
import path from 'path';
import fs from 'fs';

const CHAIN_RECORD_NAME = 'k51qzi5uqu5dljyjy7wm6qdvoqrscpg7t4kjabdm3y8nawvjucpefnoxi25ko0'

const newAccessTokenService = new PersonalAccessTokenService({
	personalAccessToken: process.env.PERSONAL_ACCESS_TOKEN,
	projectId: process.env.PROJECT_ID,
})
const fleekSdk = new FleekSdk({accessTokenService: newAccessTokenService});

const uploadDirectoryToIPFS = async (path) => {
	try {
		const result = await fleekSdk.ipfs().addFromPath(path, {wrapWithDirectory: true});
		return result
	} catch (error) {
		console.error(`Error uploading directory to IPFS: ${error}`)
	}
}


const setIPNSRecord = async (cid, retry) => {
	try {
		console.log(`Setting IPNS record for ${cid}`)
		const {id} = await fleekSdk.ipns().getRecord({name: CHAIN_RECORD_NAME});
		await new Promise(resolve => setTimeout(resolve, 10000));
		const record = await fleekSdk.ipns().publishRecord({id: id, hash: cid});
		console.log(record)
		return record
	} catch (error) {
		console.error(`Error setting IPNS record: ${error}`)
		if (retry < 10) {
			await new Promise(resolve => setTimeout(resolve, 10000));
			retry += 1
			await setIPNSRecord(cid, retry)
		}
	}
}

let cid;
const pathToData = path.join(process.cwd(), 'chains');
async function execute() {
	const timestamp = new Date().getTime().toString()
	const file = path.join(pathToData, '_info.json')
	const infoJSON = {
		timestamp: timestamp,
		record: CHAIN_RECORD_NAME
	}
	fs.writeFileSync(file, JSON.stringify(infoJSON, null, 2))


	console.log(`Uploading directory ${pathToData}`)
	const results = await uploadDirectoryToIPFS(pathToData)
	if (results) {
		for (const item of results) {
			if (item.path === '') {
				cid = item.cid
				break;
			}
		}
	}

	await setIPNSRecord(cid.toString(), 0)
	process.exit(0)
}

execute()
