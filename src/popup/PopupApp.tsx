import React, { useState, useEffect } from 'react';
import { StorageManager } from '../storage/storage-manager';
import { StorageClient, onStorageChanged } from '../storage/storage-client';
import { UserSettings, PlatformId, ChatMetadata } from '../types';
import { DEFAULT_SETTINGS } from '../storage/schema';
import { Button } from '../components/Common/Button';
import { Switch } from '../components/Common/Switch';
import { ThemeToggle } from '../components/Common/ThemeToggle';
import { BrandLogo } from '../components/Common/BrandLogo';
import { PlatformMark, PLATFORM_META, detectPlatformFromUrl } from '../components/Common/PlatformMark';
import { RefreshCw, ArrowUpRight, CheckCircle2, AlertCircle, Globe } from 'lucide-react';

type StatusMessage = { tone: 'success' | 'error'; text: string };

function countChats(chats: ChatMetadata[]) {
  const live = chats.filter((c) => c.status !== 'deleted');
  return {
    total: live.length,
    cleanup: live.filter((c) => c.category === 'cleanup').length,
    review: live.filter((c) => c.category === 'review').length,
  };
}

export const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(null);
  const [counts, setCounts] = useState({ total: 0, cleanup: 0, review: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const refreshCounts = async () => {
    const state = await StorageManager.getState();
    setSettings(state.settings);
    setCounts(countChats(Object.values(state.chats)));
  };

  useEffect(() => {
    refreshCounts();
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        setActivePlatform(detectPlatformFromUrl(tab?.url));
      });
    }
    return onStorageChanged(() => {
      refreshCounts();
    });
  }, []);

  const handleToggleDryRun = async (next: boolean) => {
    setSettings((prev) => ({ ...prev, dryRunDefault: next }));
    await StorageClient.updateSettings({ dryRunDefault: next });
  };

  const handleScanCurrent = async () => {
    setIsScanning(true);
    setStatus(null);
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        setStatus({ tone: 'error', text: 'Extension messaging is unavailable here.' });
        return;
      }
      const response: any = await chrome.runtime.sendMessage({
        type: 'TRIGGER_SCAN',
        platform: activePlatform || undefined,
      });
      if (response?.success) {
        setStatus({
          tone: 'success',
          text: `Found ${response.count} conversation${response.count === 1 ? '' : 's'}.`,
        });
        await refreshCounts();
      } else {
        setStatus({ tone: 'error', text: response?.error || 'Open a supported chat site to scan.' });
      }
    } catch (err: any) {
      setStatus({ tone: 'error', text: err.message || 'Scan failed.' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      window.close();
    } else {
      window.open('/dashboard.html', '_blank');
    }
  };

  const platformMeta = activePlatform ? PLATFORM_META[activePlatform] : null;

  return (
    <div className="flex flex-col bg-canvas text-fg">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="leading-tight">
            <h1 className="text-base font-semibold">ChatSweep</h1>
            <p className="text-sm text-fg-subtle">AI chat cleaner</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-col gap-4 p-5">
        {/* Current tab */}
        <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Current tab</p>
          <div className="mt-2.5 flex items-center gap-3">
            {activePlatform ? (
              <PlatformMark platform={activePlatform} />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-fg-subtle">
                <Globe className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">{platformMeta ? platformMeta.name : 'No supported site'}</p>
              <p className="text-sm text-fg-muted truncate">
                {platformMeta ? platformMeta.host : 'Open ChatGPT, Gemini or Claude'}
              </p>
            </div>
            {activePlatform && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
                <span className="size-1.5 rounded-full bg-accent" />
                Ready
              </span>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={handleScanCurrent}
            isLoading={isScanning}
            icon={<RefreshCw />}
          >
            {isScanning ? 'Scanning…' : platformMeta ? `Scan ${platformMeta.shortName}` : 'Scan open chat tabs'}
          </Button>

          {status && (
            <div
              role="status"
              className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm animate-fade-in ${
                status.tone === 'success' ? 'bg-accent-soft text-accent-text' : 'bg-danger-soft text-danger-text'
              }`}
            >
              {status.tone === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{status.text}</span>
            </div>
          )}
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-3 gap-3">
          <Metric label="Tracked" value={counts.total} />
          <Metric label="Cleanup" value={counts.cleanup} tone="danger" />
          <Metric label="Review" value={counts.review} tone="warning" />
        </section>

        {/* Safety */}
        <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card">
          <div>
            <p className="text-[15px] font-medium">Dry-run mode</p>
            <p className="text-sm text-fg-muted">
              {settings.dryRunDefault ? 'Actions are simulated only' : 'Live: deletions are real'}
            </p>
          </div>
          <Switch
            checked={settings.dryRunDefault}
            onChange={handleToggleDryRun}
            label="Dry-run mode"
          />
        </section>

        <Button variant="secondary" size="md" fullWidth onClick={handleOpenDashboard} icon={<ArrowUpRight />}>
          Open dashboard
        </Button>
      </main>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: 'danger' | 'warning' }> = ({ label, value, tone }) => (
  <div className="rounded-xl border border-border bg-surface px-3 py-3 shadow-card">
    <p className="text-sm text-fg-muted">{label}</p>
    <p
      className={`mt-0.5 text-2xl font-semibold tabular-nums ${
        tone === 'danger' && value > 0 ? 'text-danger-text' : tone === 'warning' && value > 0 ? 'text-warning-text' : 'text-fg'
      }`}
    >
      {value}
    </p>
  </div>
);
