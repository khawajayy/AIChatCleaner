import { AdapterRegistry } from '../adapters/registry';
import { ContentScriptMessage } from '../types/messages';

console.log('[ChatSweep] Content script loaded on:', window.location.hostname);

// Detect which adapter matches current page
const currentAdapter = AdapterRegistry.detectCurrentAdapter();

if (currentAdapter) {
  console.log(`[ChatSweep] Matched adapter: ${currentAdapter.displayName}`);
}

// Listen for messages from background script or popup
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ContentScriptMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  });
}

async function handleMessage(message: ContentScriptMessage) {
  const adapter = currentAdapter || AdapterRegistry.detectCurrentAdapter();
  if (!adapter) {
    return {
      success: false,
      error: `Unsupported platform or adapter not detected on ${window.location.hostname}`,
    };
  }

  switch (message.type) {
    case 'CONTENT_DISCOVER_CHATS': {
      try {
        const chats = await adapter.discoverChats();
        return {
          type: 'CONTENT_DISCOVER_CHATS_RESULT',
          success: true,
          chats,
        };
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
      try {
        let result;
        const dummyChat = {
          id: message.chatId,
          platform: adapter.platform,
          title: '',
          url: '',
          lastActivityTimestamp: null,
          messageCount: null,
          isEmpty: false,
          isUnfinished: false,
          category: 'cleanup' as const,
          confidence: 1,
          reasons: [],
          lastScannedAt: Date.now(),
          supportsArchive: adapter.capabilities.supportsArchive,
          supportsDelete: adapter.capabilities.supportsDelete,
          status: 'discovered' as const,
          isProtected: false,
        };

        if (message.action === 'delete') {
          result = await adapter.deleteChat(dummyChat, message.dryRun);
        } else if (message.action === 'archive' && adapter.archiveChat) {
          result = await adapter.archiveChat(dummyChat, message.dryRun);
        } else {
          result = {
            success: false,
            action: message.action,
            chatId: message.chatId,
            platform: adapter.platform,
            timestamp: Date.now(),
            verified: false,
            error: `Action ${message.action} is not supported on ${adapter.displayName}`,
          };
        }

        return {
          type: 'CONTENT_EXECUTE_ACTION_RESULT',
          result,
        };
      } catch (err: any) {
        return {
          type: 'CONTENT_EXECUTE_ACTION_RESULT',
          result: {
            success: false,
            action: message.action,
            chatId: message.chatId,
            platform: adapter.platform,
            timestamp: Date.now(),
            verified: false,
            error: err.message || 'Execution failed in content script',
          },
        };
      }
    }

    default:
      return { success: false, error: 'Unrecognized content script message type' };
  }
}
