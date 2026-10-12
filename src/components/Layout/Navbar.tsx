import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { useTheme } from './ThemeProvider';
import { UserSettings, PlatformId } from '../../types';

interface NavbarProps {
  settings: UserSettings;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  onOpenOnboarding: () => void;
  platformStatus: Record<PlatformId, { connected: boolean; totalDiscovered: number }>;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeTab,
  onSelectTab,
  onTriggerScan,
  isScanning,
  onOpenOnboarding,
  platformStatus,
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'manager', label: 'Conversation Manager' },
    { id: 'review', label: 'Review Queue' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shadow-glow">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">ChatSweep</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  v1.0 MVP
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Safe Multi-Platform AI Chat Cleaner</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-slate-800 text-brand-400 border border-slate-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Dry Run / Safety Indicator */}
          {settings.dryRunDefault ? (
            <Badge variant="green" size="md" className="hidden sm:inline-flex">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dry-Run Active (Safe)</span>
            </Badge>
          ) : (
            <Badge variant="amber" size="md" className="hidden sm:inline-flex">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Deletion Mode</span>
            </Badge>
          )}

          {/* Platform status pills */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs border-r border-slate-800 pr-3 mr-1">
            <span
              title={`ChatGPT: ${platformStatus.chatgpt.connected ? 'Active' : 'Standby'}`}
              className={`w-2 h-2 rounded-full ${
                platformStatus.chatgpt.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-400 text-[11px]">ChatGPT</span>

            <span
              title={`Gemini: ${platformStatus.gemini.connected ? 'Active' : 'Standby'}`}
              className={`w-2 h-2 rounded-full ml-1.5 ${
                platformStatus.gemini.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-400 text-[11px]">Gemini</span>

            <span
              title={`Claude: ${platformStatus.claude.connected ? 'Active' : 'Standby'}`}
              className={`w-2 h-2 rounded-full ml-1.5 ${
                platformStatus.claude.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-400 text-[11px]">Claude</span>
          </div>

          {/* Scan Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={onTriggerScan}
            isLoading={isScanning}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />}
          >
            {isScanning ? 'Scanning...' : 'Scan Chats'}
          </Button>

          {/* Onboarding info */}
          <button
            onClick={onOpenOnboarding}
            title="Safety Guide & Documentation"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
