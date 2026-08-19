// One chunk of the image pass, run in its own process.
//
// This exists because resvg can panic rather than throw. A panic in the native addon aborts the
// whole process, so no try/catch in the parent can survive it — a single hostile logo.svg would
// otherwise end a 4300-token run partway through. Isolating the work means the parent loses one
// token instead of everything, and can name the file that did it. Six logos in this corpus do it.
//
// Results are appended synchronously, one JSON object per line. That matters: a panic gives no
// chance to flush, so anything held in a stream buffer would be lost along with the knowledge of how
// far the chunk got.
//
// The two phases are written separately and in this order on purpose. Reading PNG headers is safe;
// rendering the SVG is what kills the process. Recording the safe phase first means a crashing token
// still contributes its dimension findings, and the parent detects the crash by looking for the
// missing fidelity line rather than a missing token.
//
// Called as: node auditImagesWorker.mjs <inputFile> <outputFile> [startIndex]

import fs from 'node:fs';
import {auditTokenDimensions, auditTokenFidelity} from './auditImageChecks.mjs';

const [inputFile, outputFile, startIndexRaw] = process.argv.slice(2);
const startIndex = Number.parseInt(startIndexRaw || '0', 10);
const tokens = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

function record(index, phase, findings) {
	fs.appendFileSync(outputFile, `${JSON.stringify({index, phase, findings})}\n`);
}

for (let index = startIndex; index < tokens.length; index++) {
	const token = tokens[index];
	record(index, 'dimensions', await auditTokenDimensions(token));
	record(index, 'fidelity', await auditTokenFidelity(token));
}
