import { ChatMetadata, ActionResult, PlatformId } from '../types';

export interface ChatDetails {
  id: string;
  title: string;
  url: string;
  messageCount: number | null;
  lastActivityTimestamp: number | null;
  snippet?: string;
}

export type AdapterMaturity = 'verified' | 'experimental' | 'unsupported';

export interface PlatformCapabilities {
  supportsArchive: boolean;
  supportsDelete: boolean;
  supportsMessageCount: boolean;
  maturity: AdapterMaturity;
  limitations: string[];
}

export interface ChatAdapter {
  readonly platform: PlatformId;
  readonly displayName: string;
  readonly capabilities: PlatformCapabilities;

  detectPage(): boolean;

  discoverChats(): Promise<ChatMetadata[]>;

  getChatDetails(chat: ChatMetadata): Promise<ChatDetails | null>;

  archiveChat?(chat: ChatMetadata, dryRun?: boolean): Promise<ActionResult>;

  deleteChat(chat: ChatMetadata, dryRun?: boolean): Promise<ActionResult>;

  validateChatIdentity(chat: ChatMetadata): Promise<boolean>;
}
