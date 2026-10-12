import { ChatAdapter } from './types';
import { ChatGPTAdapter } from './chatgpt';
import { GeminiAdapter } from './gemini';
import { ClaudeAdapter } from './claude';
import { PlatformId } from '../types';

export class AdapterRegistry {
  private static adapters = new Map<PlatformId, ChatAdapter>([
    ['chatgpt', new ChatGPTAdapter()],
    ['gemini', new GeminiAdapter()],
    ['claude', new ClaudeAdapter()],
  ]);

  public static getAdapter(platform: PlatformId): ChatAdapter | undefined {
    return this.adapters.get(platform);
  }

  public static getAllAdapters(): ChatAdapter[] {
    return Array.from(this.adapters.values());
  }

  public static detectCurrentAdapter(): ChatAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.detectPage()) {
        return adapter;
      }
    }
    return null;
  }
}
