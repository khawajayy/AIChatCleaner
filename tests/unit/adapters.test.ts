import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatGPTAdapter } from '../../src/adapters/chatgpt';
import { GeminiAdapter } from '../../src/adapters/gemini';
import { ClaudeAdapter } from '../../src/adapters/claude';
import { AdapterRegistry } from '../../src/adapters/registry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Platform Adapters with DOM Fixtures', () => {
  const originalLocation = window.location;

  const setMockHostname = (hostname: string) => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname,
      href: `https://${hostname}/`,
    } as any;
  };

  afterEach(() => {
    (window as any).location = originalLocation;
    document.body.innerHTML = '';
  });

  describe('ChatGPTAdapter', () => {
    const adapter = new ChatGPTAdapter();

    it('detects chatgpt.com domain properly', () => {
      setMockHostname('chatgpt.com');
      expect(adapter.detectPage()).toBe(true);

      setMockHostname('random-site.com');
      expect(adapter.detectPage()).toBe(false);
    });

    it('discovers conversations from DOM fixture', async () => {
      setMockHostname('chatgpt.com');
      const fixtureHtml = fs.readFileSync(
        path.resolve(__dirname, '../fixtures/chatgpt-dom.html'),
        'utf-8'
      );
      document.body.innerHTML = fixtureHtml;

      const discovered = await adapter.discoverChats();
      expect(discovered.length).toBe(4);
      expect(discovered[0].id).toBe('chat-uuid-1');
      expect(discovered[0].title).toBe('Test prompt 123');
      expect(discovered[1].title).toBe('Tax documents 2025');
      expect(discovered[2].title).toBe('[Work] Project Roadmap');
    });

    it('revalidates chat identity in DOM and handles dry-run deletion', async () => {
      setMockHostname('chatgpt.com');
      document.body.innerHTML = fs.readFileSync(
        path.resolve(__dirname, '../fixtures/chatgpt-dom.html'),
        'utf-8'
      );

      const chat = (await adapter.discoverChats())[0];
      const valid = await adapter.validateChatIdentity(chat);
      expect(valid).toBe(true);

      const dryRunRes = await adapter.deleteChat(chat, true);
      expect(dryRunRes.success).toBe(true);
      expect(dryRunRes.action).toBe('dry_run');
      expect(dryRunRes.verified).toBe(true);
    });
  });

  describe('GeminiAdapter', () => {
    const adapter = new GeminiAdapter();

    it('detects gemini.google.com and enforces honest capabilities', () => {
      setMockHostname('gemini.google.com');
      expect(adapter.detectPage()).toBe(true);
      expect(adapter.capabilities.supportsArchive).toBe(false); // Honest disclosure
      expect(adapter.capabilities.supportsDelete).toBe(true);
    });

    it('discovers conversations from Gemini DOM fixture', async () => {
      setMockHostname('gemini.google.com');
      document.body.innerHTML = fs.readFileSync(
        path.resolve(__dirname, '../fixtures/gemini-dom.html'),
        'utf-8'
      );

      const chats = await adapter.discoverChats();
      expect(chats.length).toBe(3);
      expect(chats[0].id).toBe('gemini-id-101');
      expect(chats[0].title).toBe('convert 50 usd to eur');
      expect(chats[2].title).toBe('Important Legal Notice');
    });
  });

  describe('ClaudeAdapter', () => {
    const adapter = new ClaudeAdapter();

    it('detects claude.ai and discovers conversations from Claude DOM fixture', async () => {
      setMockHostname('claude.ai');
      expect(adapter.detectPage()).toBe(true);

      document.body.innerHTML = fs.readFileSync(
        path.resolve(__dirname, '../fixtures/claude-dom.html'),
        'utf-8'
      );

      const chats = await adapter.discoverChats();
      expect(chats.length).toBe(2);
      expect(chats[0].id).toBe('claude-uuid-999');
      expect(chats[0].title).toBe('hi');
      expect(chats[1].title).toBe('Deep Research on Quantum Computing');
    });
  });

  describe('AdapterRegistry', () => {
    it('returns all registered adapters and detects matching adapter', () => {
      setMockHostname('claude.ai');
      const current = AdapterRegistry.detectCurrentAdapter();
      expect(current?.platform).toBe('claude');

      expect(AdapterRegistry.getAdapter('chatgpt')).toBeDefined();
      expect(AdapterRegistry.getAdapter('gemini')).toBeDefined();
      expect(AdapterRegistry.getAdapter('claude')).toBeDefined();
    });
  });
});
