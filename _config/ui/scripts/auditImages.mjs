// Orchestrates the image pass across child processes.
//
// resvg does not always throw. On at least one logo in this corpus it panics inside the Rust addon,
// which aborts the process outright — a try/catch cannot catch it, and a worker thread would not
// help either, because a panic takes the whole runtime down. Running the work in children is the
// only way a 4300-token pass survives a single hostile file.
//
// A crash is not swallowed. Each child appends its results synchronously, so when one dies the
// first token with no result line is, with certainty, the one that killed it. That token becomes a
// finding in its own right and the child is restarted just past it. It is worth reporting loudly:
// the submit API rasterizes with this same resvg, so a logo that panics here would take down a
// submission too.

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(SCRIPT_DIR, 'auditImagesWorker.mjs');
// sharp is I/O bound here, so a pool wider than the core count still pays.
const WORKERS = Math.min(8, Math.max(2, os.cpus().length - 2));

function runWorker(inputFile, outputFile, startIndex) {
	return new Promise(resolve => {
		const child = spawn(process.execPath, [WORKER, inputFile, outputFile, String(startIndex)], {
			stdio: ['ignore', 'ignore', 'ignore']
		});
		child.on('exit', code => resolve(code));
		child.on('error', () => resolve(1));
	});
}

// Returns every finding recorded so far, plus the set of tokens that got all the way through the
// render phase. Only that second set says whether a token survived: the dimension phase is written
// first and completes even for a token that goes on to abort the process.
function readResults(outputFile) {
	const findings = [];
	const rendered = new Set();
	if (!fs.existsSync(outputFile)) {
		return {findings, rendered};
	}
	for (const line of fs.readFileSync(outputFile, 'utf8').split('\n')) {
		if (line.length === 0) {
			continue;
		}
		try {
			const parsed = JSON.parse(line);
			findings.push(...parsed.findings);
			if (parsed.phase === 'fidelity') {
				rendered.add(parsed.index);
			}
		} catch {
			// A line torn in half by an abort. Its token simply counts as not yet rendered.
		}
	}
	return {findings, rendered};
}

// Runs one chunk to completion, restarting past any token that brings the renderer down.
async function runChunk(tokens, workDir, chunkID) {
	const inputFile = path.join(workDir, `chunk-${chunkID}.json`);
	const outputFile = path.join(workDir, `chunk-${chunkID}.ndjson`);
	fs.writeFileSync(inputFile, JSON.stringify(tokens));

	const crashFindings = [];
	let cursor = 0;
	while (cursor < tokens.length) {
		const code = await runWorker(inputFile, outputFile, cursor);
		if (code === 0) {
			break;
		}
		// The worker died. The first token at or after the cursor with no fidelity line is the one
		// that took the process with it. Verified on the real corpus: all six accused files abort
		// resvg again when rendered on their own.
		const {rendered} = readResults(outputFile);
		let crashed = cursor;
		while (crashed < tokens.length && rendered.has(crashed)) {
			crashed++;
		}
		if (crashed >= tokens.length) {
			break;
		}
		crashFindings.push({
			check: 'svg-crashes-renderer',
			severity: 'high',
			title: 'logo.svg crashes the SVG rasterizer',
			detail: 'resvg aborts on this file rather than reporting an error. The submit API rasterizes with the same library, so this logo would take a submission down with it.',
			entries: [tokens[crashed].entry]
		});
		cursor = crashed + 1;
	}

	return [...readResults(outputFile).findings, ...crashFindings];
}

export async function auditImages(tokens, onProgress) {
	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-audit-'));
	const chunkSize = Math.ceil(tokens.length / WORKERS);
	const chunks = [];
	for (let start = 0; start < tokens.length; start += chunkSize) {
		chunks.push(tokens.slice(start, start + chunkSize));
	}

	let done = 0;
	try {
		const perChunk = await Promise.all(
			chunks.map(async (chunk, index) => {
				const findings = await runChunk(chunk, workDir, index);
				done += chunk.length;
				if (onProgress) {
					onProgress(done, tokens.length);
				}
				return findings;
			})
		);
		return perChunk.flat();
	} finally {
		fs.rmSync(workDir, {recursive: true, force: true});
	}
}
