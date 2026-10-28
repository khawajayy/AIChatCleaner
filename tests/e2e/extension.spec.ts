// End-to-end tests: loads the built extension (dist/) into Chromium, serves a simulated
// chatgpt.com sidebar, and drives scan / dry run / live actions through the real background worker.
// Run with `npm run test:e2e`.
import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const STORAGE_KEY = 'chatsweep_state_v1';

const CHATS: [string, string][] = [
  ['c-1', 'New chat'],
  ['c-2', 'test'],
  ['c-3', 'SQL'],
  ['c-4', 'Tax'],
  ['c-5', 'API'],
  ['c-6', 'Tax documents 2025'],
  ['c-7', '[Work] Roadmap'],
  ['c-8', 'Convert 5 miles to km'],
  ['c-9', 'Refactor auth middleware'],
  ['c-10', 'hello'],
  ['c-11', 'asdf'],
  ['c-12', 'qwer'],
  ['c-13', '42'],
];

/** Radix-style sidebar: menu opens on pointerdown, delete asks for confirmation, rows vanish after a delay. */
const simulatedChatGPT = `<!doctype html><html><head><title>ChatGPT</title></head><body>
<nav><ul>${CHATS.map(
  ([id, title]) =>
    `<li><a href="/c/${id}">${title}</a><button aria-haspopup="menu" aria-label="Open conversation options">…</button></li>`
).join('')}</ul></nav>
<script>
let row = null;
const closeAll = (sel) => document.querySelectorAll(sel).forEach((el) => el.remove());
document.addEventListener('pointerdown', (e) => {
  const button = e.target.closest && e.target.closest('button[aria-haspopup="menu"]');
  if (!button) return;
  closeAll('[role=menu]');
  row = button.closest('li');
  const menu = document.createElement('div');
  menu.setAttribute('role', 'menu');
  menu.innerHTML = '<div role="menuitem">Share</div><div role="menuitem" data-a="archive">Archive</div><div role="menuitem" data-a="delete">Delete</div>';
  document.body.appendChild(menu);
});
document.addEventListener('click', (e) => {
  const item = e.target.closest && e.target.closest('[data-a]');
  if (item) {
    closeAll('[role=menu]');
    if (item.dataset.a === 'archive') { const r = row; setTimeout(() => r.remove(), 300); return; }
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML = '<button>Cancel</button><button data-confirm>Delete</button>';
    document.body.appendChild(dialog);
    return;
  }
  if (e.target.closest && e.target.closest('[data-confirm]')) {
    closeAll('[role=dialog]');
    const r = row; setTimeout(() => r.remove(), 400);
  }
});
</script></body></html>`;

let ctx: BrowserContext;
let chatPage: Page;
let dash: Page;
let extId: string;
const pageErrors: string[] = [];

const send = (msg: unknown) => dash.evaluate((m) => chrome.runtime.sendMessage(m), msg as any) as Promise<any>;
const readState = () => dash.evaluate(async (k) => (await chrome.storage.local.get(k))[k], STORAGE_KEY) as Promise<any>;
const sidebarHas = async (id: string) => (await chatPage.locator(`a[href="/c/${id}"]`).count()) === 1;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    // Lets local runs reuse an already-downloaded Chromium build
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  extId = new URL(sw.url()).host;

  await ctx.route('https://chatgpt.com/**', (r) => r.fulfill({ contentType: 'text/html', body: simulatedChatGPT }));
  chatPage = await ctx.newPage();
  chatPage.on('pageerror', (e) => pageErrors.push(`chatgpt: ${e.message}`));
  await chatPage.goto('https://chatgpt.com/');

  dash = await ctx.newPage();
  dash.on('pageerror', (e) => pageErrors.push(`dashboard: ${e.message}`));
  await dash.goto(`chrome-extension://${extId}/dashboard.html`);
  await dash.waitForLoadState('networkidle');
});

test.afterAll(async () => {
  await ctx?.close();
});

test('dashboard and popup render', async () => {
  await expect(dash.getByText('Welcome to ChatSweep')).toBeVisible();
  const popup = await ctx.newPage();
  popup.on('pageerror', (e) => pageErrors.push(`popup: ${e.message}`));
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await expect(popup.getByText('Dry-run mode')).toBeVisible();
  await popup.close();
});

test('scan discovers and classifies every sidebar chat', async () => {
  const scan = await send({ type: 'TRIGGER_SCAN', platform: 'chatgpt' });
  expect(scan.error).toBeUndefined();
  expect(scan.count).toBe(CHATS.length);

  const byTitle = Object.fromEntries(scan.chats.map((c: any) => [c.title, c]));
  expect(byTitle['Tax documents 2025'].isProtected).toBe(true); // default keyword "taxes"
  expect(byTitle['Tax'].isProtected).toBe(true);
  expect(byTitle['[Work] Roadmap'].isProtected).toBe(true); // default regex
  for (const title of ['SQL', 'API', 'Refactor auth middleware']) {
    expect(byTitle[title].category, title).not.toBe('cleanup');
  }
  for (const title of ['New chat', 'test', 'hello', 'asdf', '42']) {
    expect(byTitle[title].category, title).toBe('cleanup');
  }
});

test('dry run checks the page but changes nothing', async () => {
  const res = await send({ type: 'EXECUTE_BATCH', chatIds: ['c-1', 'c-2'], action: 'delete', dryRun: true });
  expect(res.results.map((r: any) => r.success)).toEqual([true, true]);
  expect(await sidebarHas('c-1')).toBe(true);
  expect(await sidebarHas('c-2')).toBe(true);
});

test('live batch refuses protected chats', async () => {
  const res = await send({ type: 'EXECUTE_BATCH', chatIds: ['c-6', 'c-7'], action: 'delete', dryRun: false });
  expect(res.results.every((r: any) => !r.success)).toBe(true);
  expect(await sidebarHas('c-6')).toBe(true);
  expect(await sidebarHas('c-7')).toBe(true);
});

test('live delete removes the chat and records it', async () => {
  const res = await send({ type: 'EXECUTE_BATCH', chatIds: ['c-1'], action: 'delete', dryRun: false });
  expect(res.results[0]).toMatchObject({ success: true, verified: true });
  expect(await sidebarHas('c-1')).toBe(false);
  expect((await readState()).chats['c-1'].status).toBe('deleted');
});

test('live archive removes the chat', async () => {
  const res = await send({ type: 'EXECUTE_BATCH', chatIds: ['c-10'], action: 'archive', dryRun: false });
  expect(res.results[0]).toMatchObject({ success: true });
  expect(await sidebarHas('c-10')).toBe(false);
});

test('a chat protected while its batch is running is not deleted', async () => {
  const batch = send({ type: 'EXECUTE_BATCH', chatIds: ['c-2', 'c-11', 'c-12'], action: 'delete', dryRun: false });
  // c-12 runs last (~2.4s in, with the 1.2s default delay); protect it during the first action
  await dash.waitForTimeout(600);
  await dash.evaluate(async (k) => {
    const s = (await chrome.storage.local.get(k))[k] as any;
    s.chats['c-12'].isProtected = true;
    s.settings.protectedChatIds.push('c-12');
    await chrome.storage.local.set({ [k]: s });
  }, STORAGE_KEY);

  const res = await batch;
  expect(res.results.map((r: any) => [r.chatId, r.success])).toEqual([
    ['c-2', true],
    ['c-11', true],
    ['c-12', false],
  ]);
  expect(await sidebarHas('c-12')).toBe(true);
  expect((await readState()).chats['c-12'].isProtected).toBe(true);
});

test('unknown messages are rejected', async () => {
  expect((await send({ type: 'NOT_A_REAL_MESSAGE' })).success).toBe(false);
});

test('no uncaught page errors', async () => {
  expect(pageErrors).toEqual([]);
});
