import { BaseAdapter } from './base';
import { ChatDetails, PlatformCapabilities } from './types';
import { ActionResult, ChatMetadata, PlatformId } from '../types';

export class ClaudeAdapter extends BaseAdapter {
  readonly platform: PlatformId = 'claude';
  readonly displayName = 'Anthropic Claude';
  readonly capabilities: PlatformCapabilities = {
    supportsArchive: false, // Claude consumer UI does not have an Archive feature
    supportsDelete: true,
    supportsMessageCount: false,
    maturity: 'verified',
    limitations: [
      'Claude web interface supports Delete and Star, but has no Archive function',
      'Chat list requires the sidebar panel to be expanded',
    ],
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'claude.ai';
  }

  public async discoverChats(): Promise<ChatMetadata[]> {
    if (!this.detectPage()) return [];

    const discovered: ChatMetadata[] = [];
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/chat/"]'));
    const seenIds = new Set<string>();

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/chat\/([a-zA-Z0-9_-]+)/);
      if (!match) continue;

      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const title = (link.textContent || '').trim() || 'Claude Conversation';
      const fullUrl = `https://claude.ai/chat/${id}`;

      discovered.push({
        id,
        platform: 'claude',
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
        supportsArchive: false,
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
        platform: 'claude',
        timestamp: Date.now(),
        verified: false,
        error: `Target Claude chat "${chat.title}" (${chat.id}) not found in active DOM.`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        action: 'dry_run',
        chatId: chat.id,
        platform: 'claude',
        timestamp: Date.now(),
        verified: true,
      };
    }

    try {
      const link = document.querySelector<HTMLAnchorElement>(`a[href*="/chat/${chat.id}"]`);
      if (!link) throw new Error('Claude conversation link not found.');

      const container = link.closest('li') || link.parentElement;
      const menuBtn = container?.querySelector<HTMLButtonElement>(
        'button[aria-label*="options"], button[aria-label*="menu"], button[aria-haspopup="menu"]'
      );

      if (menuBtn) {
        menuBtn.click();
      } else {
        link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await this.sleep(200);
      }

      await this.sleep(300);

      const menuItems = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], button'));
      const deleteItem = menuItems.find((el) =>
        el.textContent?.trim().toLowerCase().includes('delete')
      );

      if (!deleteItem) {
        throw new Error('Claude Delete menu item not found.');
      }

      deleteItem.click();
      await this.sleep(300);

      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (!dialog) {
        throw new Error('Claude delete confirmation modal did not open.');
      }

      const confirmBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim().toLowerCase() === 'delete'
      );

      if (!confirmBtn) {
        throw new Error('Confirm Delete button not found inside modal.');
      }

      confirmBtn.click();
      await this.sleep(500);

      const remaining = document.querySelector<HTMLAnchorElement>(`a[href*="/chat/${chat.id}"]`);
      return {
        success: !remaining,
        action: 'delete',
        chatId: chat.id,
        platform: 'claude',
        timestamp: Date.now(),
        verified: !remaining,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'delete',
        chatId: chat.id,
        platform: 'claude',
        timestamp: Date.now(),
        verified: false,
        error: err.message || 'Error executing Claude conversation deletion.',
      };
    }
  }
}
