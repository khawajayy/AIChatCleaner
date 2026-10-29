import { BaseAdapter, MenuActionSpec } from './base';
import { PlatformCapabilities } from './types';
import { PlatformId } from '../types';

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

  // Matches /c/{id} and project chats like /g/g-p-xxx/c/{id}
  protected readonly chatPathPattern = /\/c\/([A-Za-z0-9-]+)(?:[/?#]|$)/;
  protected readonly fallbackTitle = 'Untitled Chat';

  protected readonly menuButtonSelectors = [
    'button[data-testid^="history-item-"][data-testid$="-options"]',
    'button[data-testid*="conversation-options"]',
    'button[aria-haspopup="menu"]',
    'button[aria-label*="options"]',
    'button[aria-label*="Options"]',
  ];

  // Checked against chatgpt.com on 2026-10-14: the row button matched aria-haspopup, menu items
  // had no data-testid (text match "Delete"), and the confirm button reads "Delete chat".
  protected readonly deleteSpec: MenuActionSpec = {
    action: 'delete',
    menuItemSelectors: ['[data-testid="delete-chat-menu-item"]'],
    menuItemLabel: /^delete/i,
    confirm: {
      selectors: ['[data-testid="delete-conversation-confirm-button"]'],
      label: /^delete/i,
    },
  };

  protected readonly archiveSpec: MenuActionSpec = {
    action: 'archive',
    menuItemSelectors: ['[data-testid="archive-chat-menu-item"]'],
    menuItemLabel: /^archive/i,
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    // chat.openai.com redirects here and is not in the manifest's host permissions
    return window.location.hostname === 'chatgpt.com';
  }

  protected buildChatUrl(id: string): string {
    return `https://chatgpt.com/c/${id}`;
  }
}
