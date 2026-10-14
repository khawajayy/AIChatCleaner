import { PlatformId } from '../types';

/** Match patterns for chrome.tabs.query({ url }). Must stay within manifest host_permissions. */
export const PLATFORM_TAB_PATTERNS: Record<PlatformId, string[]> = {
  chatgpt: ['https://chatgpt.com/*'],
  gemini: ['https://gemini.google.com/*'],
  claude: ['https://claude.ai/*'],
};

export const PLATFORM_HOSTS: Record<PlatformId, { name: string; host: string }> = {
  chatgpt: { name: 'ChatGPT', host: 'chatgpt.com' },
  gemini: { name: 'Gemini', host: 'gemini.google.com' },
  claude: { name: 'Claude', host: 'claude.ai' },
};

export function platformFromUrl(url?: string): PlatformId | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (host === 'chatgpt.com' || host === 'chat.openai.com') return 'chatgpt';
  if (host === 'gemini.google.com') return 'gemini';
  if (host === 'claude.ai') return 'claude';
  return null;
}
