// Copies the store zip into the landing page (docs/download/) for manual installs.
// Run via `npm run site`, which builds the zip and the page script first.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const zip = path.join(root, 'release', `chatsweep-${version}.zip`);

if (!fs.existsSync(zip)) {
  console.error(`build-site: ${path.relative(root, zip)} not found. Run \`npm run package\` first.`);
  process.exit(1);
}

const downloadDir = path.join(root, 'docs', 'download');
fs.mkdirSync(downloadDir, { recursive: true });
for (const old of fs.readdirSync(downloadDir)) {
  if (old.endsWith('.zip')) fs.rmSync(path.join(downloadDir, old));
}
// Stable name, so the page's download link never changes between versions
fs.copyFileSync(zip, path.join(downloadDir, 'chatsweep.zip'));
console.log(`build-site: docs/download/chatsweep.zip <- ${path.relative(root, zip)}`);
