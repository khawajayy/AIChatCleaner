import React, { useState, useEffect } from 'react';
import { StorageManager } from '../storage/storage-manager';
import { UserSettings, PlatformId } from '../types';
import { DEFAULT_SETTINGS } from '../storage/schema';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Trash2,
  HelpCircle,
} from 'lucide-react';

export const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(null);
  const [totalChats, setTotalChats] = useState(0);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load settings & counts
    StorageManager.getState().then((state) => {
      setSettings(state.settings);
      const chatList = Object.values(state.chats);
      setTotalChats(chatList.length);
      setCleanupCount(chatList.filter((c) => c.category === 'cleanup' && c.status !== 'deleted').length);
      setReviewCount(chatList.filter((c) => c.category === 'review' && c.status !== 'deleted').length);
    });

    // 2. Query active tab
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (!tab || !tab.url) return;
        if (tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com')) {
          setActivePlatform('chatgpt');
        } else if (tab.url.includes('gemini.google.com')) {
          setActivePlatform('gemini');
        } else if (tab.url.includes('claude.ai')) {
          setActivePlatform('claude');
        }
      });
    }
  }, []);

  const handleToggleDryRun = async () => {
    const nextVal = !settings.dryRunDefault;
    await StorageManager.updateSettings({ dryRunDefault: nextVal });
    setSettings((prev) => ({ ...prev, dryRunDefault: nextVal }));
  };

  const handleScanCurrent = async () => {
    setIsScanning(true);
    setStatusMessage(null);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response: any = await chrome.runtime.sendMessage({
          type: 'TRIGGER_SCAN',
          platform: activePlatform || undefined,
        });

        if (response && response.success) {
          setStatusMessage(`Found ${response.count} chats!`);
          const state = await StorageManager.getState();
          const chatList = Object.values(state.chats);
          setTotalChats(chatList.length);
          setCleanupCount(chatList.filter((c) => c.category === 'cleanup' && c.status !== 'deleted').length);
          setReviewCount(chatList.filter((c) => c.category === 'review' && c.status !== 'deleted').length);
        } else {
          setStatusMessage(response?.error || 'Please open a chatbot tab to scan.');
        }
      } else {
        setStatusMessage('Extension messaging unavailable in popup.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Scan error.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    } else {
      window.open('/dashboard.html', '_blank');
    }
  };

  return (
    <div className="w-[380px] bg-slate-950 text-slate-100 p-4 font-sans select-none border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shadow-glow">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white leading-tight">ChatSweep</h1>
            <p className="text-[10px] text-slate-400">AI Chat Cleaner</p>
          </div>
        </div>

        {/* Safety Badge */}
        <button
          onClick={handleToggleDryRun}
          title="Click to toggle dry-run safety mode"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
            settings.dryRunDefault
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {settings.dryRunDefault ? (
            <>
              <ShieldCheck className="w-3 h-3" />
              <span>Dry-Run On</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3" />
              <span>Live Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Active Tab Platform Status */}
      <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Current Tab Status:</span>
          {activePlatform ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {activePlatform === 'chatgpt' ? 'ChatGPT' : activePlatform === 'gemini' ? 'Gemini' : 'Claude'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              No Chatbot Active
            </span>
          )}
        </div>

        <button
          onClick={handleScanCurrent}
          disabled={isScanning}
          className="mt-2.5 w-full py-2 px-3 rounded-lg bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-glow transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning Chats...' : activePlatform ? `Scan ${activePlatform.toUpperCase()}` : 'Scan AI Platform'}
        </button>

        {statusMessage && (
          <p className="text-[11px] text-brand-300 mt-2 text-center truncate">
            {statusMessage}
          </p>
        )}
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 mx-auto mb-1" />
          <span className="text-[10px] text-slate-500 block">Total</span>
          <span className="text-base font-bold font-mono text-white">{totalChats}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
          <Trash2 className="w-3.5 h-3.5 text-rose-400 mx-auto mb-1" />
          <span className="text-[10px] text-slate-500 block">Cleanup</span>
          <span className="text-base font-bold font-mono text-rose-400">{cleanupCount}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
          <span className="text-[10px] text-slate-500 block">Review</span>
          <span className="text-base font-bold font-mono text-amber-400">{reviewCount}</span>
        </div>
      </div>

      {/* Open Dashboard Button */}
      <button
        onClick={handleOpenDashboard}
        className="mt-3 w-full py-2 px-3 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <span>Open Conversation Manager</span>
        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
      </button>
    </div>
  );
};
