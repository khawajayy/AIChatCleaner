import React from 'react';
import {
  LayoutDashboard,
  MessagesSquare,
  ListChecks,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../Common/Button';
import { BrandLogo } from '../Common/BrandLogo';
import { ThemeToggle } from '../Common/ThemeToggle';
import { PLATFORM_META } from '../Common/PlatformMark';
import { UserSettings, PlatformId } from '../../types';

export type DashboardTab = 'dashboard' | 'manager' | 'review' | 'settings';

export const NAV_ITEMS: { id: DashboardTab; label: string; description: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', description: 'Scan status and recent activity across your AI chat platforms.', Icon: LayoutDashboard },
  { id: 'manager', label: 'Conversations', description: 'Search, filter and act on every conversation ChatSweep has found.', Icon: MessagesSquare },
  { id: 'review', label: 'Review queue', description: 'Conversations flagged for cleanup or a second look.', Icon: ListChecks },
  { id: 'settings', label: 'Settings', description: 'Safety limits, protection rules and your local data.', Icon: SettingsIcon },
];

interface SidebarProps {
  settings: UserSettings;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenOnboarding: () => void;
  reviewCount: number;
  platformStatus: Record<PlatformId, { connected: boolean; totalDiscovered: number }>;
}

const version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : '';

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  activeTab,
  onSelectTab,
  onOpenOnboarding,
  reviewCount,
  platformStatus,
}) => {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border">
        <BrandLogo size="sm" />
        <div className="leading-tight">
          <p className="text-base font-semibold">ChatSweep</p>
          <p className="text-xs text-fg-subtle">AI chat cleaner{version && ` · v${version}`}</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 h-10 text-[15px] font-medium transition-colors ${
                active ? 'bg-accent-soft text-accent-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'review' && reviewCount > 0 && (
                <span className="min-w-6 rounded-full bg-warning-soft px-1.5 text-center text-xs font-semibold leading-5 text-warning-text tabular-nums">
                  {reviewCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Platforms</p>
          {(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => {
            const connected = platformStatus[p].connected;
            return (
              <div key={p} className="flex items-center gap-3 px-3 h-9 text-sm text-fg-muted">
                <span
                  className={`size-2 rounded-full ${connected ? 'bg-accent' : 'bg-border-strong'}`}
                  aria-hidden="true"
                />
                <span className="flex-1">{PLATFORM_META[p].shortName}</span>
                <span className="text-xs text-fg-subtle">{connected ? 'Scanned' : 'Not scanned'}</span>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors ${
            settings.dryRunDefault ? 'bg-accent-soft hover:brightness-95' : 'bg-warning-soft hover:brightness-95'
          }`}
        >
          {settings.dryRunDefault ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-text" />
          ) : (
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning-text" />
          )}
          <div>
            <p className={`text-sm font-semibold ${settings.dryRunDefault ? 'text-accent-text' : 'text-warning-text'}`}>
              {settings.dryRunDefault ? 'Dry-run is on' : 'Live mode'}
            </p>
            <p className="text-xs text-fg-muted">
              {settings.dryRunDefault ? 'Nothing will be deleted.' : 'Deletions are permanent.'}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="flex w-full items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
        >
          <HelpCircle className="size-[18px]" />
          How ChatSweep works
        </button>
      </div>
    </aside>
  );
};

interface TopBarProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  reviewCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onSelectTab, onTriggerScan, isScanning, reviewCount }) => {
  const current = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/85 backdrop-blur-md">
      <div className="flex items-center gap-4 px-6 lg:px-10 h-16">
        <div className="flex items-center gap-3 lg:hidden">
          <BrandLogo size="sm" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{current.label}</h1>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button variant="primary" size="md" onClick={onTriggerScan} isLoading={isScanning} icon={<RefreshCw />}>
            {isScanning ? 'Scanning…' : 'Scan chats'}
          </Button>
        </div>
      </div>

      {/* Compact navigation below the lg breakpoint, where the sidebar is hidden */}
      <nav aria-label="Main" className="lg:hidden flex gap-1 overflow-x-auto px-4 pb-2">
        {NAV_ITEMS.map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 h-9 text-sm font-medium transition-colors ${
                active ? 'bg-accent-soft text-accent-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              {label}
              {id === 'review' && reviewCount > 0 && ` (${reviewCount})`}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
