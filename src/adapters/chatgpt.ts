import { BaseAdapter } from './base';
import { ChatDetails, PlatformCapabilities } from './types';
import { ActionResult, ChatMetadata, PlatformId } from '../types';

export class ChatGPTAdapter extends BaseAdapter {
  readonly platform: PlatformId = 'chatgpt';
  readonly displayName = 'ChatGPT';
  readonly capabilities: PlatformCapabilities = {
    supportsArchive: true,
    supportsDelete: true,
    supportsMessageCount: false, // Not exposed in sidebar DOM
    maturity: 'verified',
    limitations: [
      'Message count requires opening individual conversations',
      'Requires scrolling the sidebar to discover deep historical conversations',
    ],
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'chatgpt.com' || hostname === 'chat.openai.com';
  }

  public async discoverChats(): Promise<ChatMetadata[]> {
    if (!this.detectPage()) return [];

    const discovered: ChatMetadata[] = [];
    const chatLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/c/"]'));

    const seenIds = new Set<string>();

    for (const link of chatLinks) {
      const href = link.getAttribute('href') || '';
      const idMatch = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (!idMatch) continue;

      const id = idMatch[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      // Extract title safely
      const title = (link.textContent || '').trim() || 'Untitled Chat';
      const fullUrl = `https://chatgpt.com/c/${id}`;

      discovered.push({
        id,
        platform: 'chatgpt',
        title,
        url: fullUrl,
        lastActivityTimestamp: null,
        messageCount: null,
        isEmpty: title.toLowerCase() === 'new chat' || title.length === 0,
        isUnfinished: false,
        category: 'keep',
        confidence: 0.5,
        reasons: [],
        lastScannedAt: Date.now(),
        supportsArchive: true,
        supportsDelete: true,
        status: 'discovered',
        isProtected: false,
      });
    }

    return discovered;
  }

  public async getChatDetails(chat: ChatMetadata): Promise<ChatDetails | null> {
    const valid = await this.validateChatIdentity(chat);
    if (!valid) return null;

    return {
      id: chat.id,
      title: chat.title,
      url: chat.url,
      messageCount: chat.messageCount,
      lastActivityTimestamp: chat.lastActivityTimestamp,
    };
  }

  public async deleteChat(chat: ChatMetadata, dryRun = false): Promise<ActionResult> {
    const isIdentityValid = await this.validateChatIdentity(chat);
    if (!isIdentityValid) {
      return {
        success: false,
        action: dryRun ? 'dry_run' : 'delete',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: false,
        error: `Target conversation "${chat.title}" (${chat.id}) could not be located in current DOM.`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        action: 'dry_run',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: true,
      };
    }

    try {
      // 1. Locate the anchor element
      const link = document.querySelector<HTMLAnchorElement>(`a[href*="/c/${chat.id}"]`);
      if (!link) {
        throw new Error('Chat link no longer visible.');
      }

      // 2. Trigger options menu
      // Find options button inside the item container
      const parent = link.closest('li') || link.parentElement;
      const optionsBtn = parent?.querySelector<HTMLButtonElement>(
        'button[data-testid*="conversation-options"], button[aria-haspopup="menu"]'
      );

      if (optionsBtn) {
        optionsBtn.click();
      } else {
        // Dispatch hover event or focus to reveal options
        link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await this.sleep(200);
        const lateBtn = parent?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
        if (lateBtn) lateBtn.click();
      }

      await this.sleep(300);

      // 3. Find Delete menu item
      const menuItems = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      const deleteItem = menuItems.find((item) =>
        item.textContent?.toLowerCase().includes('delete')
      );

      if (!deleteItem) {
        throw new Error('Delete option not found in conversation action menu.');
      }

      deleteItem.click();
      await this.sleep(300);

      // 4. Find confirm delete button in dialog
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!dialog) {
        throw new Error('Confirmation dialog did not appear.');
      }

      const confirmBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim().toLowerCase() === 'delete'
      );

      if (!confirmBtn) {
        throw new Error('Confirmation delete button not found in modal.');
      }

      confirmBtn.click();
      await this.sleep(500);

      // 5. Observable DOM evidence: Verify link is removed from DOM
      const remaining = document.querySelector<HTMLAnchorElement>(`a[href*="/c/${chat.id}"]`);
      const isGone = !remaining;

      return {
        success: isGone,
        action: 'delete',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: isGone,
        error: isGone ? undefined : 'Conversation still detected in DOM after deletion attempt.',
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'delete',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: false,
        error: err.message || 'Unknown error executing deletion.',
      };
    }
  }

  protected async executeArchiveInternal(chat: ChatMetadata, dryRun = false): Promise<ActionResult> {
    const isIdentityValid = await this.validateChatIdentity(chat);
    if (!isIdentityValid) {
      return {
        success: false,
        action: dryRun ? 'dry_run' : 'archive',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: false,
        error: `Target conversation "${chat.title}" (${chat.id}) could not be located in current DOM.`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        action: 'dry_run',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: true,
      };
    }

    try {
      const link = document.querySelector<HTMLAnchorElement>(`a[href*="/c/${chat.id}"]`);
      if (!link) throw new Error('Chat link no longer visible.');

      const parent = link.closest('li') || link.parentElement;
      const optionsBtn = parent?.querySelector<HTMLButtonElement>(
        'button[data-testid*="conversation-options"], button[aria-haspopup="menu"]'
      );
      if (optionsBtn) {
        optionsBtn.click();
        await this.sleep(300);
      }

      const menuItems = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      const archiveItem = menuItems.find((item) =>
        item.textContent?.toLowerCase().includes('archive')
      );

      if (!archiveItem) {
        throw new Error('Archive option not found in conversation action menu.');
      }

      archiveItem.click();
      await this.sleep(500);

      const remaining = document.querySelector<HTMLAnchorElement>(`a[href*="/c/${chat.id}"]`);
      return {
        success: !remaining,
        action: 'archive',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: !remaining,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'archive',
        chatId: chat.id,
        platform: 'chatgpt',
        timestamp: Date.now(),
        verified: false,
        error: err.message || 'Failed to archive chat.',
      };
    }
  }
}
