import '@testing-library/jest-dom';
import { vi } from 'vitest';

// In-memory mock storage for chrome.storage.local
const storageState: Record<string, any> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | Record<string, any> | null, callback?: (items: any) => void) => {
        let result: Record<string, any> = {};
        if (keys === null) {
          result = { ...storageState };
        } else if (typeof keys === 'string') {
          result[keys] = storageState[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach((k) => {
            result[k] = storageState[k];
          });
        } else if (typeof keys === 'object') {
          for (const k in keys) {
            result[k] = storageState[k] !== undefined ? storageState[k] : keys[k];
          }
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, any>, callback?: () => void) => {
        Object.assign(storageState, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[], callback?: () => void) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach((k) => delete storageState[k]);
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: vi.fn((callback?: () => void) => {
        for (const k in storageState) delete storageState[k];
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
    create: vi.fn(),
  },
  permissions: {
    contains: vi.fn().mockResolvedValue(true),
    request: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
  },
};

(globalThis as any).chrome = chromeMock;

// Helper to reset mock storage between tests
export const resetMockStorage = () => {
  for (const k in storageState) delete storageState[k];
  vi.clearAllMocks();
};
