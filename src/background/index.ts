import { StorageManager } from '../storage/storage-manager';
import { ClassificationEngine } from '../classifier/engine';
import { SafeBatchExecutor } from './batch-executor';
import { TabActionDispatcher, findPlatformTab, ensureContentScript, sendToTab } from './tab-dispatcher';
import { platformFromUrl } from '../adapters/platform-urls';
import { ExtensionMessage } from '../types/messages';
import { PlatformId } from '../types';

console.log('[ChatSweep] Background service worker initialized.');

if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('[ChatSweep] Extension installed or updated.');
    const state = await StorageManager.getState();
    if (!state.settings.onboardingCompleted) {
      // First install: open dashboard tab
      chrome.tabs?.create({
        url: chrome.runtime.getURL('dashboard.html?onboarding=true'),
      });
    }
  });
}

// Global message handler
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    // Content scripts only answer tabs.sendMessage; ignore anything they send here
    if (sender.tab && platformFromUrl(sender.tab.url)) return false;
    handleBackgroundMessage(message, sender)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  });
}

async function handleBackgroundMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'GET_STORAGE_DATA': {
      return await StorageManager.getState();
    }

    case 'GET_SETTINGS': {
      return await StorageManager.getSettings();
    }

    case 'UPDATE_SETTINGS': {
      const { payload, reclassify } = message;
      // Reclassify the stored chats in the same write, so chats changed since the UI last read are not overwritten
      return await StorageManager.mutate((state) => {
        state.settings = { ...state.settings, ...payload };
        if (reclassify) {
          for (const chat of ClassificationEngine.classifyBatch(Object.values(state.chats), state.settings)) {
            state.chats[chat.id] = chat;
          }
        }
        return state.settings;
      });
    }

    case 'RESET_STORAGE': {
      await StorageManager.resetAllData();
      return { success: true };
    }

    case 'EXPORT_DATA': {
      const data = await StorageManager.exportDataJson();
      return { success: true, data };
    }

    case 'DETECT_ACTIVE_TAB': {
      if (!chrome.tabs?.query) {
        return { connected: false, platform: null };
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        return { connected: false, platform: null };
      }

      let detectedPlatform: PlatformId | null = null;
      if (tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com')) {
        detectedPlatform = 'chatgpt';
      } else if (tab.url.includes('gemini.google.com')) {
        detectedPlatform = 'gemini';
      } else if (tab.url.includes('claude.ai')) {
        detectedPlatform = 'claude';
      }

      return {
        connected: !!detectedPlatform,
        platform: detectedPlatform,
        tabId: tab.id,
        url: tab.url,
      };
    }

    case 'TRIGGER_SCAN': {
      return await triggerPlatformScan(message.platform);
    }

    case 'UPDATE_CHAT_CATEGORY': {
      const updated = await StorageManager.updateChat(message.chatId, {
        category: message.category,
        userOverrideCategory: message.category,
      });
      return { success: !!updated, chat: updated };
    }

    case 'UPDATE_CHAT_STATUS': {
      const updated = await StorageManager.updateChat(message.chatId, {
        status: message.status,
      });
      return { success: !!updated, chat: updated };
    }

    case 'TOGGLE_CHAT_PROTECTION': {
      const chat = await StorageManager.getChatById(message.chatId);
      if (!chat) return { success: false, error: 'Chat not found' };
      const updated = await StorageManager.setChatProtection(message.chatId, !chat.isProtected);
      return { success: !!updated, chat: updated };
    }

    case 'SET_CHAT_PROTECTION': {
      const updated = await StorageManager.setChatProtection(message.chatId, message.isProtected);
      if (!updated) return { success: false, error: 'Chat not found' };
      return { success: true, chat: updated };
    }

    case 'EXECUTE_BATCH': {
      const settings = await StorageManager.getSettings();
      const allChats = await StorageManager.getChats();
      // Keep the user's selection order, not storage order
      const byId = new Map(allChats.map((c) => [c.id, c]));
      const targetChats = message.chatIds.flatMap((id) => byId.get(id) ?? []);

      // Actions run in each chat tab's content script; the dashboard tab is restored afterwards.
      const dispatcher = new TabActionDispatcher(sender.tab);
      try {
        const batchResult = await SafeBatchExecutor.executeBatch(
          targetChats,
          message.action,
          message.dryRun,
          settings,
          (progress) => {
            // Broadcast progress to open dashboard/popup
            chrome.runtime?.sendMessage?.({
              type: 'BATCH_PROGRESS',
              current: progress.current,
              total: progress.total,
              currentChat: progress.currentChatTitle,
              result: progress.result,
              isComplete: progress.isComplete,
              cancelled: progress.cancelled,
            }).catch(() => {});
          },
          dispatcher.dispatch
        );
        return { success: true, ...batchResult };
      } finally {
        await dispatcher.restore();
      }
    }

    case 'CANCEL_BATCH': {
      SafeBatchExecutor.cancel();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Scans the matching platform tab (active one preferred) and stores classified results.
 */
async function triggerPlatformScan(targetPlatform?: PlatformId): Promise<any> {
  if (!chrome.tabs?.query) {
    return { success: false, error: 'chrome.tabs API unavailable' };
  }

  const candidateTab = await findPlatformTab(targetPlatform);
  const detectedPlatform = platformFromUrl(candidateTab?.url);

  if (!candidateTab?.id || !detectedPlatform) {
    return {
      success: false,
      error: `No open tab found for ${targetPlatform || 'supported AI chatbots'}. Please open ${targetPlatform || 'ChatGPT, Gemini, or Claude'} in a tab and log in.`,
    };
  }

  try {
    await ensureContentScript(candidateTab.id);
    const response: any = await sendToTab(candidateTab.id, { type: 'CONTENT_DISCOVER_CHATS' });

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Content script failed to respond or scan DOM.',
      };
    }

    const rawChats = response.chats || [];
    const settings = await StorageManager.getSettings();

    // Run discovered chats through classification engine
    const classifiedChats = ClassificationEngine.classifyBatch(rawChats, settings);
    await StorageManager.saveChats(classifiedChats);

    await StorageManager.updatePlatformStatus(detectedPlatform, {
      lastScanTimestamp: Date.now(),
      connected: true,
      totalDiscovered: classifiedChats.length,
      lastError: undefined,
    });

    return {
      success: true,
      platform: detectedPlatform,
      count: classifiedChats.length,
      chats: classifiedChats,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Could not communicate with tab. Make sure the page is fully loaded. (${err.message})`,
    };
  }
}
