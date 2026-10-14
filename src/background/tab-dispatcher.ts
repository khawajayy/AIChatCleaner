import { ActionResult, ChatMetadata, PlatformId } from '../types';
import { PLATFORM_HOSTS, PLATFORM_TAB_PATTERNS } from '../adapters/platform-urls';
import type { ActionDispatcher } from './batch-executor';

const ACTION_TIMEOUT_MS = 45_000;
const PING_TIMEOUT_MS = 2_000;

/** Picks the platform tab the user most likely means: active first, then most recently used. */
export async function findPlatformTab(platform?: PlatformId): Promise<chrome.tabs.Tab | undefined> {
  const patterns = platform ? PLATFORM_TAB_PATTERNS[platform] : Object.values(PLATFORM_TAB_PATTERNS).flat();
  const tabs = await chrome.tabs.query({ url: patterns });
  return tabs
    .filter((t) => t.id !== undefined && !t.discarded)
    .sort((a, b) => Number(b.active) - Number(a.active) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
}

export function sendToTab<T>(tabId: number, message: unknown, timeoutMs = ACTION_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The page took too long to respond.')), timeoutMs);
    chrome.tabs.sendMessage(tabId, message).then(
      (res) => {
        clearTimeout(timer);
        resolve(res as T);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function ping(tabId: number): Promise<boolean> {
  try {
    const res = await sendToTab<{ ok?: boolean }>(tabId, { type: 'CONTENT_PING' }, PING_TIMEOUT_MS);
    return !!res?.ok;
  } catch {
    return false;
  }
}

/**
 * Content scripts declared in the manifest only run in tabs loaded after install,
 * so inject on demand for tabs that were already open.
 */
export async function ensureContentScript(tabId: number): Promise<void> {
  if (await ping(tabId)) return;
  if (!chrome.scripting?.executeScript) {
    throw new Error('Could not connect to the page. Reload the tab and try again.');
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (err: any) {
    throw new Error(`Could not connect to the page (${err?.message || 'injection failed'}). Reload the tab and try again.`);
  }
  if (!(await ping(tabId))) {
    throw new Error('Could not connect to the page. Reload the tab and try again.');
  }
}

async function waitForTabComplete(tabId: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) throw new Error('The tab was closed.');
    if (tab.status === 'complete') return;
    await new Promise((r) => setTimeout(r, 250));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs each batch action inside the matching chat tab's content script.
 * Live actions bring that tab to the front first: background tabs throttle timers
 * and can pause rendering, which breaks menu and dialog detection.
 */
export class TabActionDispatcher {
  private tabs = new Map<PlatformId, chrome.tabs.Tab>();
  private frontTabId: number | undefined;

  constructor(private readonly originTab?: chrome.tabs.Tab) {}

  public dispatch: ActionDispatcher = async (chat, action, dryRun) => {
    const fail = (error: string): ActionResult => ({
      success: false,
      action: dryRun ? 'dry_run' : action,
      chatId: chat.id,
      platform: chat.platform,
      timestamp: Date.now(),
      verified: false,
      error,
    });

    const tab = await this.getTab(chat.platform);
    if (!tab?.id) {
      const { name, host } = PLATFORM_HOSTS[chat.platform];
      return fail(`No ${name} tab is open. Open ${host}, sign in, and try again.`);
    }

    try {
      await ensureContentScript(tab.id);
    } catch (err: any) {
      return fail(err.message);
    }

    if (!dryRun) await this.bringToFront(tab);

    try {
      const res = await sendToTab<{ result?: ActionResult }>(tab.id, {
        type: 'CONTENT_EXECUTE_ACTION',
        chat,
        action,
        dryRun,
      });
      return res?.result ?? fail('The page did not return a result.');
    } catch (err: any) {
      if (dryRun) return fail(`Lost connection to the page: ${err?.message || 'unknown error'}`);
      // The page may have navigated or reloaded mid-action (e.g. deleting the open chat).
      return this.verifyAfterDisconnect(tab.id, chat, action, fail);
    }
  };

  /** Puts the user back on the tab they started from (usually the dashboard). */
  public async restore(): Promise<void> {
    if (this.frontTabId === undefined || !this.originTab?.id) return;
    try {
      await chrome.tabs.update(this.originTab.id, { active: true });
      if (this.originTab.windowId !== undefined) {
        await chrome.windows.update(this.originTab.windowId, { focused: true });
      }
    } catch {
      // Origin tab may have been closed
    }
  }

  private async getTab(platform: PlatformId): Promise<chrome.tabs.Tab | undefined> {
    const cached = this.tabs.get(platform);
    if (cached?.id !== undefined) {
      const stillOpen = await chrome.tabs.get(cached.id).catch(() => null);
      if (stillOpen) return stillOpen;
    }
    const tab = await findPlatformTab(platform);
    if (tab) this.tabs.set(platform, tab);
    return tab;
  }

  private async bringToFront(tab: chrome.tabs.Tab): Promise<void> {
    if (tab.id === undefined || this.frontTabId === tab.id) return;
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }
    this.frontTabId = tab.id;
    await sleep(500); // let the page resume rendering
  }

  private async verifyAfterDisconnect(
    tabId: number,
    chat: ChatMetadata,
    action: 'archive' | 'delete',
    fail: (error: string) => ActionResult
  ): Promise<ActionResult> {
    try {
      await waitForTabComplete(tabId);
      await ensureContentScript(tabId);
      await sleep(2000); // sidebar renders after load

      const check = await sendToTab<{ present?: boolean; linkCount?: number }>(
        tabId,
        { type: 'CONTENT_CHECK_PRESENT', chatId: chat.id },
        PING_TIMEOUT_MS
      );
      // Only trust "gone" if the sidebar actually loaded other conversations.
      if (check && check.present === false && (check.linkCount ?? 0) > 0) {
        return {
          success: true,
          action,
          chatId: chat.id,
          platform: chat.platform,
          timestamp: Date.now(),
          verified: true,
        };
      }
      return fail(
        check?.present
          ? `"${chat.title}" is still in the sidebar after the page reloaded.`
          : "The page reloaded and the result couldn't be confirmed. Rescan to check."
      );
    } catch (err: any) {
      return fail(`Lost connection to the page and couldn't confirm the result (${err?.message || 'unknown error'}).`);
    }
  }
}
