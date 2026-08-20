// Reads the live state of a token folder on the base repo. The submit route needs this because the
// deployment root is _config/ui: the tokens/ tree is not on the server filesystem, and the committed
// public/data snapshot it used to rely on is a build-time artefact that can lag behind main.

import type {Octokit} from '@octokit/core';

type TFolderEntry = {
	name: string;
	sha: string;
};

type THttpError = {
	status?: number;
};

// Returns null when the folder does not exist on `ref` — that is the authoritative "this token is new"
// answer, on the exact case-sensitive path the PR will write to.
export async function readFolderEntries(
	octokit: Octokit,
	owner: string,
	repo: string,
	ref: string,
	folder: string
): Promise<TFolderEntry[] | null> {
	try {
		const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
			owner,
			repo,
			path: folder,
			ref
		});
		if (!Array.isArray(response.data)) {
			return null;
		}
		return response.data.map(entry => {
			return {name: entry.name, sha: entry.sha};
		});
	} catch (error) {
		if ((error as THttpError).status === 404) {
			return null;
		}
		throw error;
	}
}

// Read by blob sha rather than by path: a blob sha is immutable, so there is no caching ambiguity
// between the listing above and the content fetched here.
export async function readBlobText(octokit: Octokit, owner: string, repo: string, sha: string): Promise<string> {
	const response = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
		owner,
		repo,
		// biome-ignore lint/style/useNamingConvention: GitHub's REST parameter name, not ours.
		file_sha: sha
	});
	return Buffer.from(response.data.content, 'base64').toString('utf8');
}
