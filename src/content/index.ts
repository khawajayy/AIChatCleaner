import { AdapterRegistry } from '../adapters/registry';
import { ContentScriptMessage } from '../types/messages';
import { ActionResult } from '../types';

// The background worker may inject this file into tabs opened before install;
// guard so a tab that already has the manifest-injected copy doesn't get two listeners.
const LOADED_FLAG = '__chatsweepContentLoaded';

if (!(window as any)[LOADED_FLAG]) {
  (window as any)[LOADED_FLAG] = true;
  if (import.meta.env.DEV) console.log('[ChatSweep] Content script loaded on:', window.location.hostname);

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: ContentScriptMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response
    });
  }
}

// Only one destructive action at a time per tab
let actionInFlight = false;

async function handleMessage(message: ContentScriptMessage) {
  const adapter = AdapterRegistry.detectCurrentAdapter();
  if (!adapter) {
    return {
      success: false,
      error: `Unsupported platform or adapter not detected on ${window.location.hostname}`,
    };
  }

  switch (message.type) {
    case 'CONTENT_PING':
      return { ok: true, platform: adapter.platform };

    case 'CONTENT_CHECK_PRESENT':
      return {
        success: true,
        present: adapter.isChatPresent(message.chatId),
        linkCount: adapter.countChatLinks(),
      };

    case 'CONTENT_DISCOVER_CHATS': {
      try {
        const chats = await adapter.discoverChats();
        return { type: 'CONTENT_DISCOVER_CHATS_RESULT', success: true, chats };
      } catch (err: any) {
        return {
          type: 'CONTENT_DISCOVER_CHATS_RESULT',
          success: false,
          chats: [],
          error: err.message || 'Error discovering chats in active DOM',
        };
      }
    }

    case 'CONTENT_EXECUTE_ACTION': {
      const { chat, action, dryRun } = message;
      const fail = (error: string): ActionResult => ({
        success: false,
        action: dryRun ? 'dry_run' : action,
        chatId: chat?.id ?? '',
        platform: adapter.platform,
        timestamp: Date.now(),
        verified: false,
        error,
      });

      if (!chat?.id) return { type: 'CONTENT_EXECUTE_ACTION_RESULT', result: fail('No conversation was specified.') };
      if (chat.platform !== adapter.platform) {
        return {
          type: 'CONTENT_EXECUTE_ACTION_RESULT',
          result: fail(`This conversation belongs to ${chat.platform}, not ${adapter.displayName}.`),
        };
      }
      if (actionInFlight) {
        return { type: 'CONTENT_EXECUTE_ACTION_RESULT', result: fail('Another action is already running in this tab.') };
      }

      actionInFlight = true;
      try {
        let result: ActionResult;
        if (action === 'delete') {
          result = await adapter.deleteChat(chat, dryRun);
        } else if (action === 'archive' && adapter.archiveChat) {
          result = await adapter.archiveChat(chat, dryRun);
        } else {
          result = fail(`Action ${action} is not supported on ${adapter.displayName}`);
        }
        return { type: 'CONTENT_EXECUTE_ACTION_RESULT', result };
      } catch (err: any) {
        return { type: 'CONTENT_EXECUTE_ACTION_RESULT', result: fail(err.message || 'Execution failed in content script') };
      } finally {
        actionInFlight = false;
      }
    }

    default:
      return { success: false, error: 'Unrecognized content script message type' };
  }
}
