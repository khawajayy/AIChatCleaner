import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StorageManager, STORAGE_KEY } from '../../storage/storage-manager';
import { StorageClient } from '../../storage/storage-client';
import { UserSettings } from '../../types';

export type ThemePreference = UserSettings['theme'];
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

// Mirrors the key read by public/theme-init.js
const THEME_CACHE_KEY = 'chatsweep-theme';

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  resolvedTheme: 'light',
  setPreference: () => {},
  toggleTheme: () => {},
});

const darkQuery = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return darkQuery()?.matches ? 'dark' : 'light';
  return pref;
}

function readCachedPreference(): ThemePreference {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached === 'light' || cached === 'dark' || cached === 'system') return cached;
  } catch {
    // Storage blocked; fall through to default
  }
  return 'system';
}

function applyToDocument(pref: ThemePreference): ResolvedTheme {
  const resolved = resolve(pref);
  const root = document.documentElement;
  if (root.classList.contains('dark') !== (resolved === 'dark')) {
    // Swap themes in one frame instead of letting every transition-colors element fade
    root.classList.add('theme-switching');
    root.classList.toggle('dark', resolved === 'dark');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
  }
  try {
    localStorage.setItem(THEME_CACHE_KEY, pref);
  } catch {
    // Non-fatal: only affects first-paint flash avoidance
  }
  return resolved;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readCachedPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(readCachedPreference()));

  // Load the persisted preference from extension storage
  useEffect(() => {
    StorageManager.getSettings().then((s) => {
      if (s.theme) setPreferenceState(s.theme);
    });
  }, []);

  // Apply whenever preference changes, and follow the OS while on "system"
  useEffect(() => {
    setResolvedTheme(applyToDocument(preference));
    if (preference !== 'system') return;

    const mq = darkQuery();
    if (!mq) return;
    const onChange = () => setResolvedTheme(applyToDocument('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  // Keep popup and dashboard in sync when the other one changes the theme
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      const newState = changes[STORAGE_KEY].newValue as { settings?: UserSettings } | undefined;
      const next = newState?.settings?.theme;
      if (next) setPreferenceState((prev) => (prev === next ? prev : next));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    StorageClient.updateSettings({ theme: pref }).catch((err) => console.error('Theme could not be saved:', err));
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
