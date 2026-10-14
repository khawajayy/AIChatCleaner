import { BaseAdapter, MenuActionSpec } from './base';
import { PlatformCapabilities } from './types';
import { PlatformId } from '../types';

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

  protected readonly chatPathPattern = /\/app\/([A-Za-z0-9_-]+)(?:[/?#]|$)/;
  protected readonly fallbackTitle = 'Gemini Conversation';

  protected readonly menuButtonSelectors = [
    'button[data-test-id="actions-menu-button"]',
    'button[aria-label*="More"]',
    'button[aria-label*="actions"]',
    'button[aria-haspopup="menu"]',
  ];

  // Checked against gemini.google.com on 2026-10-14: "More options for …" button, delete-button item,
  // confirm button found by its "Delete" text (confirm-button did not match).
  protected readonly deleteSpec: MenuActionSpec = {
    action: 'delete',
    menuItemSelectors: ['[data-test-id="delete-button"]'],
    menuItemLabel: /^delete/i,
    confirm: {
      selectors: ['[data-test-id="confirm-button"]'],
      label: /^delete/i,
    },
  };

  public detectPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'gemini.google.com';
  }

  protected buildChatUrl(id: string): string {
    return `https://gemini.google.com/app/${id}`;
  }
}
