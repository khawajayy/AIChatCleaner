// Renders Chrome Web Store screenshots and promo tiles from the built extension pages.
//   npm run store:assets
// Serves dist/ with sample data and captures each page with headless Chrome using a
// throwaway profile, writing PNGs to store/assets/. Set CHROME_PATH if Chrome isn't found.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const distDir = path.join(root, 'dist');
const assetDir = import.meta.dirname;
const outDir = path.join(root, 'store', 'assets');

const SHOTS = [
  { file: 'screenshot-1-overview.png', url: '/store/shot-dashboard.html?theme=light&tab=dashboard', size: [1280, 800] },
  { file: 'screenshot-2-conversations.png', url: '/store/shot-dashboard.html?theme=dark&tab=manager&step=select', size: [1280, 800] },
  { file: 'screenshot-3-review.png', url: '/store/shot-dashboard.html?theme=light&tab=review', size: [1280, 800] },
  { file: 'screenshot-4-dry-run.png', url: '/store/shot-dashboard.html?theme=light&tab=manager&step=dialog', size: [1280, 800] },
  { file: 'screenshot-5-popup.png', url: '/store/shot-popup.html', size: [1280, 800] },
  { file: 'promo-small-440x280.png', url: '/store/promo.html?size=small', size: [440, 280] },
  // Uses screenshot 2, so it must come after it.
  { file: 'promo-marquee-1400x560.png', url: '/store/promo.html?size=marquee', size: [1400, 560] },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file;
    if (url.pathname === '/popup-demo.html') {
      // Real popup with a chrome.* shim injected before anything else runs
      const html = fs
        .readFileSync(path.join(distDir, 'popup.html'), 'utf8')
        .replace('<head>', '<head><script src="/store/popup-shim.js"></script>');
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(html);
    } else if (url.pathname.startsWith('/store/')) {
      file = path.join(assetDir, url.pathname.slice('/store/'.length));
    } else if (url.pathname.startsWith('/out/')) {
      file = path.join(outDir, url.pathname.slice('/out/'.length));
    } else {
      file = path.join(distDir, url.pathname);
    }
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const chrome = findChrome();
if (!chrome) {
  console.error('store:assets: Chrome not found. Set CHROME_PATH to your Chrome executable.');
  process.exit(1);
}
if (!fs.existsSync(path.join(distDir, 'dashboard.html'))) {
  console.error('store:assets: dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
let failed = 0;

for (const shot of SHOTS) {
  const out = path.join(outDir, shot.file);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chatsweep-shot-'));
  const [w, h] = shot.size;
  fs.rmSync(out, { force: true });

  // Async spawn: the page server runs in this process, so blocking here would deadlock Chrome.
  const result = await new Promise((resolve) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`,
      `--window-size=${w},${h}`,
      '--virtual-time-budget=8000',
      `--screenshot=${out}`,
      base + shot.url,
    ]);
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 60_000);
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stderr });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stderr, error });
    });
  });
  fs.rmSync(profile, { recursive: true, force: true });

  if (!fs.existsSync(out)) {
    failed++;
    console.error(`  x ${shot.file}: no output (${(result.stderr || result.error?.message || '').trim().split('\n').pop()})`);
    continue;
  }
  const [aw, ah] = pngSize(out);
  const ok = aw === w && ah === h;
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok' : 'x '} ${shot.file} ${aw}x${ah}${ok ? '' : ` (expected ${w}x${h})`}`);
}

server.close();
if (failed) process.exit(1);
console.log(`\nWrote ${SHOTS.length} images to ${path.relative(root, outDir)}`);
