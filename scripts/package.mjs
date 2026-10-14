// Zips the built extension in dist/ into release/chatsweep-<version>.zip for the Chrome Web Store.
// manifest.json must sit at the root of the zip, so we zip dist's contents, not the folder.
// Uses only Node built-ins (zlib.deflateRawSync / zlib.crc32, Node >= 22.2).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const distDir = path.join(root, 'dist');
const releaseDir = path.join(root, 'release');

const fail = (msg) => {
  console.error(`\npackage: ${msg}\n`);
  process.exit(1);
};

if (typeof zlib.crc32 !== 'function') fail('Node 22.2 or newer is required (zlib.crc32).');

const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('dist/manifest.json not found. Run `npm run build` first.');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) {
  console.warn(`package: warning: manifest version ${manifest.version} differs from package.json ${pkg.version}.`);
}

// Collect files, rejecting anything that shouldn't ship to the store.
const BLOCKED = [/\.map$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.zip$/];
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(distDir, full).split(path.sep).join('/');
    if (entry.isDirectory()) walk(full);
    else if (BLOCKED.some((re) => re.test(rel))) console.warn(`package: skipping ${rel}`);
    else files.push({ rel, full });
  }
})(distDir);

// Every file the manifest references must exist in the bundle.
const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...(manifest.content_scripts ?? []).flatMap((cs) => [...(cs.js ?? []), ...(cs.css ?? [])]),
].filter(Boolean);
const present = new Set(files.map((f) => f.rel));
const missing = referenced.filter((r) => !present.has(r));
if (missing.length) fail(`manifest references missing files: ${missing.join(', ')}`);

// Minimal ZIP writer (deflate, UTF-8 names, fixed timestamps for reproducible output).
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
const locals = [];
const centrals = [];
let offset = 0;

for (const { rel, full } of files) {
  const data = fs.readFileSync(full);
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  const crc = zlib.crc32(data);
  const name = Buffer.from(rel, 'utf8');

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, name, compressed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);

  offset += local.length + name.length + compressed.length;
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

fs.mkdirSync(releaseDir, { recursive: true });
const outPath = path.join(releaseDir, `chatsweep-${manifest.version}.zip`);
fs.writeFileSync(outPath, Buffer.concat([...locals, ...centrals, end]));

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`\nPackaged ${files.length} files (${kb} KB) -> ${path.relative(root, outPath)}`);
console.log(`Permissions: ${(manifest.permissions ?? []).join(', ') || 'none'}`);
console.log(`Host permissions: ${(manifest.host_permissions ?? []).join(', ') || 'none'}`);
console.log('Upload this zip at https://chrome.google.com/webstore/devconsole\n');
