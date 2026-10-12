import { BaseAdapter } from './base';
import { ChatDetails, PlatformCapabilities } from './types';
import { ActionResult, ChatMetadata, PlatformId } from '../types';

export class GeminiAdapter extends BaseAdapter {
  readonly platform: PlatformId = 'gemini';
  readonly displayName = 'Google Gemini';
  readonly capabilities: PlatformCapabilities = {
    supportsArchive: false, // Consumer Gemini UI only supports Delete / Pin / Rename
    supportsDelete: true,
    supportsMessageCount: false,
    maturity: 'verified',
    limitations: [
      'Gemini consumer interface does not offer an Archive feature (only Delete)',
      'Requires open sidebar drawer to discover all chat entries',
    ],
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'gemini.google.com';
  }

  public async discoverChats(): Promise<ChatMetadata[]> {
    if (!this.detectPage()) return [];

    const discovered: ChatMetadata[] = [];
    // Query links to conversations: /app/c/{id} or /app/{id}
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]'));
    const seenIds = new Set<string>();

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/app\/([a-zA-Z0-9_-]+)/);
      if (!match) continue;

      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const title = (link.textContent || '').trim() || 'Gemini Conversation';
      const fullUrl = `https://gemini.google.com/app/${id}`;

      discovered.push({
        id,
        platform: 'gemini',
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
        platform: 'gemini',
        timestamp: Date.now(),
        verified: false,
        error: `Target Gemini chat "${chat.title}" (${chat.id}) not found in active DOM.`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        action: 'dry_run',
        chatId: chat.id,
        platform: 'gemini',
        timestamp: Date.now(),
        verified: true,
      };
    }

    try {
      const link = document.querySelector<HTMLAnchorElement>(`a[href*="/app/${chat.id}"]`);
      if (!link) throw new Error('Chat item element not found.');

      const container = link.closest('[role="listitem"]') || link.parentElement;
      const menuBtn = container?.querySelector<HTMLButtonElement>(
        'button[aria-label*="More"], button[aria-label*="actions"], button[aria-haspopup="menu"]'
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
        throw new Error('Delete menu option not visible.');
      }

      deleteItem.click();
      await this.sleep(300);

      const dialog = document.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
      if (!dialog) {
        throw new Error('Gemini confirmation dialog did not appear.');
      }

      const confirmBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim().toLowerCase() === 'delete'
      );

      if (!confirmBtn) {
        throw new Error('Confirm Delete button not found inside dialog.');
      }

      confirmBtn.click();
      await this.sleep(500);

      const remaining = document.querySelector<HTMLAnchorElement>(`a[href*="/app/${chat.id}"]`);
      return {
        success: !remaining,
        action: 'delete',
        chatId: chat.id,
        platform: 'gemini',
        timestamp: Date.now(),
        verified: !remaining,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'delete',
        chatId: chat.id,
        platform: 'gemini',
        timestamp: Date.now(),
        verified: false,
        error: err.message || 'Error executing Gemini chat deletion.',
      };
    }
  }
}
