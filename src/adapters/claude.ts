import { BaseAdapter, MenuActionSpec } from './base';
import { PlatformCapabilities } from './types';
import { PlatformId } from '../types';

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

  protected readonly chatPathPattern = /\/chat\/([A-Za-z0-9-]+)(?:[/?#]|$)/;
  protected readonly fallbackTitle = 'Claude Conversation';

  protected readonly menuButtonSelectors = [
    'button[aria-label^="More options"]',
    'button[data-testid*="chat-menu"]',
    'button[aria-haspopup="menu"]',
    'button[aria-label*="options"]',
    'button[aria-label*="Options"]',
  ];

  // Checked against claude.ai on 2026-10-14: "More options for …" button, delete-chat-trigger item,
  // confirm button found by its "Delete" text (delete-modal-confirm did not match).
  protected readonly deleteSpec: MenuActionSpec = {
    action: 'delete',
    menuItemSelectors: ['[data-testid="delete-chat-trigger"]'],
    menuItemLabel: /^delete/i, // item text includes a shortcut letter: "DeleteD"
    confirm: {
      selectors: ['[data-testid="delete-modal-confirm"]'],
      label: /^delete/i,
    },
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'claude.ai';
  }

  protected buildChatUrl(id: string): string {
    return `https://claude.ai/chat/${id}`;
  }
}
