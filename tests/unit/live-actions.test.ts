import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTAdapter } from '../../src/adapters/chatgpt';
import { ClaudeAdapter } from '../../src/adapters/claude';
import { GeminiAdapter } from '../../src/adapters/gemini';
import { BaseAdapter } from '../../src/adapters/base';
import { SafeBatchExecutor, ActionDispatcher } from '../../src/background/batch-executor';
import { DEFAULT_SETTINGS } from '../../src/storage/schema';
import { ChatMetadata } from '../../src/types';
import { resetMockStorage } from '../setup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => fs.readFileSync(path.resolve(__dirname, `../fixtures/${name}`), 'utf-8');

const originalLocation = window.location;
const setHostname = (hostname: string) => {
  delete (window as any).location;
  window.location = { ...originalLocation, hostname, href: `https://${hostname}/` } as any;
};

const FAST = { reveal: 10, menu: 300, dialog: 300, removal: 300 };

function fastAdapter<T extends BaseAdapter>(adapter: T): T {
  adapter.timing = { ...FAST };
  return adapter;
}

interface SimOptions {
  /** 'pointerdown' mimics Radix (ChatGPT, Claude); 'click' mimics Angular Material (Gemini). */
  openOn: 'pointerdown' | 'click';
  showDialog?: boolean;
  /** Simulates a menu that belongs to another row. */
  wrongMenuId?: boolean;
  rowSelector: string;
  /** Visible label text, as seen on the live sites (Claude: "DeleteD", ChatGPT confirm: "Delete chat"). */
  menuDeleteText?: string;
  confirmText?: string;
}

/** Minimal stand-in for a chat site's sidebar menu, confirm dialog and row removal. */
function installSidebarSimulator(opts: SimOptions) {
  let activeRow: Element | null = null;
  let menuCount = 0;

  const openMenu = (button: HTMLElement) => {
    activeRow = button.closest(opts.rowSelector);
    const id = `menu-${++menuCount}`;
    button.setAttribute('aria-controls', id);
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.id = opts.wrongMenuId ? 'someone-elses-menu' : id;
    menu.innerHTML = `<div role="menuitem">Rename</div><div role="menuitem" data-sim="delete">${opts.menuDeleteText ?? 'Delete'}</div>`;
    document.body.appendChild(menu);
  };

  const onOpen = (e: Event) => {
    const button = (e.target as HTMLElement).closest?.('button[aria-haspopup="menu"]') as HTMLElement | null;
    if (button) openMenu(button);
  };

  const onClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.matches?.('[data-sim="delete"]')) {
      target.closest('[role="menu"]')?.remove();
      if (opts.showDialog !== false) {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.innerHTML = `<p>Delete chat?</p><button>Cancel</button><button data-sim="confirm">${opts.confirmText ?? 'Delete'}</button>`;
        document.body.appendChild(dialog);
      }
    } else if (target.matches?.('[data-sim="confirm"]')) {
      target.closest('[role="dialog"]')?.remove();
      activeRow?.remove();
    }
  };

  document.addEventListener(opts.openOn, onOpen);
  document.addEventListener('click', onClick);
  return () => {
    document.removeEventListener(opts.openOn, onOpen);
    document.removeEventListener('click', onClick);
  };
}

let uninstall: (() => void) | null = null;

afterEach(() => {
  uninstall?.();
  uninstall = null;
  (window as any).location = originalLocation;
  document.body.innerHTML = '';
});

describe('Live deletion in the page', () => {
  it('ChatGPT: opens a pointerdown-only menu, confirms, and verifies only the target row is gone', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML = fixture('chatgpt-dom.html');
    uninstall = installSidebarSimulator({ openOn: 'pointerdown', rowSelector: 'li' });

    const adapter = fastAdapter(new ChatGPTAdapter());
    const chats = await adapter.discoverChats();
    const target = chats.find((c) => c.id === 'chat-uuid-2')!;

    const res = await adapter.deleteChat(target, false);

    expect(res).toMatchObject({ success: true, verified: true, action: 'delete', chatId: 'chat-uuid-2' });
    expect(adapter.isChatPresent('chat-uuid-2')).toBe(false);
    expect(adapter.countChatLinks()).toBe(3);
  });

  it('Claude: deletes through its menu and confirm dialog', async () => {
    setHostname('claude.ai');
    document.body.innerHTML = fixture('claude-dom.html');
    uninstall = installSidebarSimulator({ openOn: 'pointerdown', rowSelector: 'li' });

    const adapter = fastAdapter(new ClaudeAdapter());
    const [target] = await adapter.discoverChats();
    const res = await adapter.deleteChat(target, false);

    expect(res.success).toBe(true);
    expect(adapter.isChatPresent('claude-uuid-999')).toBe(false);
    expect(adapter.isChatPresent('claude-uuid-888')).toBe(true);
  });

  it('Gemini: works with a click-opened menu', async () => {
    setHostname('gemini.google.com');
    document.body.innerHTML = fixture('gemini-dom.html');
    uninstall = installSidebarSimulator({ openOn: 'click', rowSelector: '[role="listitem"]' });

    const adapter = fastAdapter(new GeminiAdapter());
    const target = (await adapter.discoverChats()).find((c) => c.id === 'gemini-id-102')!;
    const res = await adapter.deleteChat(target, false);

    expect(res.success).toBe(true);
    expect(adapter.isChatPresent('gemini-id-102')).toBe(false);
    expect(adapter.countChatLinks()).toBe(2);
  });

  it('matches the label variants seen on the live sites, without data-testids', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML = fixture('chatgpt-dom.html');
    uninstall = installSidebarSimulator({
      openOn: 'pointerdown',
      rowSelector: 'li',
      menuDeleteText: 'DeleteD', // Claude appends a shortcut letter
      confirmText: 'Delete chat', // ChatGPT's confirm button
    });

    const adapter = fastAdapter(new ChatGPTAdapter());
    const [target] = await adapter.discoverChats();
    const res = await adapter.deleteChat(target, false);

    expect(res.success).toBe(true);
    expect(adapter.isChatPresent(target.id)).toBe(false);
  });

  it('fails without deleting when the confirmation dialog never appears', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML = fixture('chatgpt-dom.html');
    uninstall = installSidebarSimulator({ openOn: 'pointerdown', rowSelector: 'li', showDialog: false });

    const adapter = fastAdapter(new ChatGPTAdapter());
    const [target] = await adapter.discoverChats();
    const res = await adapter.deleteChat(target, false);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/confirmation dialog/i);
    expect(adapter.isChatPresent(target.id)).toBe(true);
  });

  it('aborts if the menu that opened belongs to a different row', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML = fixture('chatgpt-dom.html');
    uninstall = installSidebarSimulator({ openOn: 'pointerdown', rowSelector: 'li', wrongMenuId: true });

    const adapter = fastAdapter(new ChatGPTAdapter());
    const [target] = await adapter.discoverChats();
    const res = await adapter.deleteChat(target, false);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/different menu/i);
    expect(adapter.countChatLinks()).toBe(4);
  });

  it('matches conversation ids exactly, never by prefix or title', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML =
      '<ul><li><a href="/c/chat-uuid-10">Same title</a></li><li><a href="/c/chat-uuid-1">Same title</a></li></ul>';

    const adapter = new ChatGPTAdapter();
    expect(adapter.findChatLink('chat-uuid-1')?.getAttribute('href')).toBe('/c/chat-uuid-1');
    expect(adapter.findChatLink('chat-uuid')).toBeNull();
  });

  it('dry run checks the row and its menu button without opening anything', async () => {
    setHostname('chatgpt.com');
    document.body.innerHTML = fixture('chatgpt-dom.html');
    const adapter = fastAdapter(new ChatGPTAdapter());
    const [target] = await adapter.discoverChats();

    const ok = await adapter.deleteChat(target, true);
    expect(ok).toMatchObject({ success: true, action: 'dry_run' });
    expect(document.querySelector('[role="menu"]')).toBeNull();

    const missing = await adapter.deleteChat({ ...target, id: 'not-in-sidebar' }, true);
    expect(missing.success).toBe(false);
    expect(missing.error).toMatch(/isn't loaded/);
  });
});

describe('SafeBatchExecutor with a page dispatcher', () => {
  beforeEach(() => resetMockStorage());

  const chats: ChatMetadata[] = ['a', 'b', 'c'].map((id) => ({
    id,
    platform: 'chatgpt',
    title: `Chat ${id}`,
    url: `https://chatgpt.com/c/${id}`,
    lastActivityTimestamp: null,
    messageCount: null,
    isEmpty: false,
    isUnfinished: false,
    category: 'cleanup',
    confidence: 0.9,
    reasons: [],
    lastScannedAt: Date.now(),
    supportsArchive: true,
    supportsDelete: true,
    status: 'discovered',
    isProtected: false,
  }));
  const settings = { ...DEFAULT_SETTINGS, actionDelayMs: 0 };

  const ok = (chat: ChatMetadata, action: 'delete' | 'archive', dryRun: boolean) => ({
    success: true,
    action: dryRun ? ('dry_run' as const) : action,
    chatId: chat.id,
    platform: chat.platform,
    timestamp: Date.now(),
    verified: true,
  });

  it('routes live deletes through the dispatcher and stops at the first failure', async () => {
    const dispatcher = vi.fn<ActionDispatcher>(async (chat, action, dryRun) =>
      chat.id === 'b' ? { ...ok(chat, action, dryRun), success: false, verified: false, error: 'menu missing' } : ok(chat, action, dryRun)
    );

    const res = await SafeBatchExecutor.executeBatch(chats, 'delete', false, settings, undefined, dispatcher);

    expect(dispatcher).toHaveBeenCalledTimes(2);
    expect(res.results.map((r) => r.success)).toEqual([true, false]);
    expect(res.stoppedOnError).toContain('menu missing');
  });

  it('sends dry runs to the page when a dispatcher is available', async () => {
    const dispatcher = vi.fn<ActionDispatcher>(async (chat, action, dryRun) => ok(chat, action, dryRun));
    await SafeBatchExecutor.executeBatch(chats, 'delete', true, settings, undefined, dispatcher);
    expect(dispatcher).toHaveBeenCalledTimes(3);
    expect(dispatcher.mock.calls.every(([, , dryRun]) => dryRun === true)).toBe(true);
  });

  it('never runs a live action without a page dispatcher', async () => {
    const res = await SafeBatchExecutor.executeBatch(chats, 'delete', false, settings);
    expect(res.results).toHaveLength(1);
    expect(res.results[0].success).toBe(false);
  });

  it('skips protected chats without calling the dispatcher for them', async () => {
    const dispatcher = vi.fn<ActionDispatcher>(async (chat, action, dryRun) => ok(chat, action, dryRun));
    const withProtected = [{ ...chats[0], isProtected: true }, chats[1]];
    const res = await SafeBatchExecutor.executeBatch(withProtected, 'delete', false, settings, undefined, dispatcher);
    expect(dispatcher).toHaveBeenCalledTimes(1);
    expect(dispatcher.mock.calls[0][0].id).toBe('b');
    expect(res.results[0].error).toContain('strictly protected');
  });
});
