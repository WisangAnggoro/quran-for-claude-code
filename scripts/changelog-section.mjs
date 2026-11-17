// Prints the CHANGELOG.md section for one version, for GitHub release notes.
//   node scripts/changelog-section.mjs 0.1.0
// Exits non-zero if the version has no section, so a release can't go out without notes.

import { readFileSync } from 'node:fs';

const version = (process.argv[2] ?? '').replace(/^v/, '');
if (!version) {
  console.error('usage: node scripts/changelog-section.mjs <version>');
  process.exit(2);
}
const text = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lines = text.split('\n');
const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no "## [${version}]" section`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
if (end === -1) end = lines.length;
const body = lines.slice(start + 1, end).join('\n').trim();
if (!body) {
  console.error(`CHANGELOG.md section for ${version} is empty`);
  process.exit(1);
}
console.log(body);
