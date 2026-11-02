// Renders the extension and landing page icons from store/logo/*.svg.
//   npm run icons
// 16 and 32 use the simplified mark so it stays readable in a browser tab. The 128 keeps
// the 16px transparent margin the Chrome Web Store asks for. Set PLAYWRIGHT_CHROMIUM_PATH
// to reuse a Chromium you already have.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, 'store', 'logo', name), 'utf8');
const full = read('logo.svg');
const small = read('logo-small.svg');

const ICONS = [
  { size: 16, svg: small, margin: 0 },
  { size: 32, svg: small, margin: 0 },
  { size: 48, svg: full, margin: 0 },
  { size: 128, svg: full, margin: 16 },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const iconDir = path.join(root, 'public', 'icons');
for (const { size, svg, margin } of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;position:absolute;left:${margin}px;top:${margin}px;width:${size - margin * 2}px;height:${size - margin * 2}px}</style>${svg}`
  );
  await page.screenshot({ path: path.join(iconDir, `icon${size}.png`), omitBackground: true });
  await page.close();
  console.log(`icons: public/icons/icon${size}.png`);
}
await browser.close();

fs.copyFileSync(path.join(iconDir, 'icon128.png'), path.join(root, 'docs', 'assets', 'icon128.png'));
fs.copyFileSync(path.join(root, 'store', 'logo', 'logo-small.svg'), path.join(root, 'docs', 'assets', 'logo.svg'));
