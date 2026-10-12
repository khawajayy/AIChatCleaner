import { StorageManager } from '../storage/storage-manager';
import { ClassificationEngine } from '../classifier/engine';
import { SafeBatchExecutor } from './batch-executor';
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
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    handleBackgroundMessage(message)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  });
}

async function handleBackgroundMessage(message: ExtensionMessage): Promise<any> {
  switch (message.type) {
    case 'GET_STORAGE_DATA': {
      return await StorageManager.getState();
    }

    case 'GET_SETTINGS': {
      return await StorageManager.getSettings();
    }

    case 'UPDATE_SETTINGS': {
      return await StorageManager.updateSettings(message.payload);
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

      const newProtectedState = !chat.isProtected;
      const updated = await StorageManager.updateChat(message.chatId, {
        isProtected: newProtectedState,
        category: newProtectedState ? 'keep' : chat.category,
      });

      // Update protectedChatIds list in settings as well
      const settings = await StorageManager.getSettings();
      let protectedIds = [...settings.protectedChatIds];
      if (newProtectedState) {
        if (!protectedIds.includes(message.chatId)) protectedIds.push(message.chatId);
      } else {
        protectedIds = protectedIds.filter((id) => id !== message.chatId);
      }
      await StorageManager.updateSettings({ protectedChatIds: protectedIds });

      return { success: true, chat: updated };
    }

    case 'EXECUTE_BATCH': {
      const settings = await StorageManager.getSettings();
      const allChats = await StorageManager.getChats();
      const targetChats = allChats.filter((c) => message.chatIds.includes(c.id));

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
        }
      );

      return { success: true, ...batchResult };
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
 * Triggers a scan on the active or matching tab
 */
async function triggerPlatformScan(targetPlatform?: PlatformId): Promise<any> {
  if (!chrome.tabs?.query) {
    return { success: false, error: 'chrome.tabs API unavailable' };
  }

  // Find tabs matching platform
  const tabs = await chrome.tabs.query({});
  const candidateTab = tabs.find((t) => {
    if (!t.url) return false;
    if (targetPlatform) {
      if (targetPlatform === 'chatgpt') return t.url.includes('chatgpt.com') || t.url.includes('chat.openai.com');
      if (targetPlatform === 'gemini') return t.url.includes('gemini.google.com');
      if (targetPlatform === 'claude') return t.url.includes('claude.ai');
    }
    return (
      t.url.includes('chatgpt.com') ||
      t.url.includes('gemini.google.com') ||
      t.url.includes('claude.ai')
    );
  });

  if (!candidateTab || !candidateTab.id) {
    return {
      success: false,
      error: `No open tab found for ${targetPlatform || 'supported AI chatbots'}. Please open ${targetPlatform || 'ChatGPT, Gemini, or Claude'} in a tab and log in.`,
    };
  }

  // Send discovery message to content script
  try {
    const response: any = await chrome.tabs.sendMessage(candidateTab.id, {
      type: 'CONTENT_DISCOVER_CHATS',
    });

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

    // Save into storage
    await StorageManager.saveChats(classifiedChats);

    // Update platform status
    const detectedPlatform: PlatformId = candidateTab.url?.includes('chatgpt.com')
      ? 'chatgpt'
      : candidateTab.url?.includes('gemini.google.com')
      ? 'gemini'
      : 'claude';

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
