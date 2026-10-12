import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { StatCard } from '../components/Dashboard/StatCard';
import { PlatformStatusCard } from '../components/Dashboard/PlatformStatusCard';
import { RecentActivity } from '../components/Dashboard/RecentActivity';
import { FilterBar } from '../components/ConversationManager/FilterBar';
import { ConversationTable } from '../components/ConversationManager/ConversationTable';
import { BulkActionBar } from '../components/ConversationManager/BulkActionBar';
import { ConfirmationDialog } from '../components/ConversationManager/ConfirmationDialog';
import { ReviewCard } from '../components/ReviewQueue/ReviewCard';
import { GeneralSettings } from '../components/Settings/GeneralSettings';
import { ExclusionsManager } from '../components/Settings/ExclusionsManager';
import { DataManagement } from '../components/Settings/DataManagement';
import { OnboardingModal } from '../components/Onboarding/OnboardingModal';
import { StorageManager } from '../storage/storage-manager';
import { ClassificationEngine } from '../classifier/engine';
import { SafeBatchExecutor } from '../background/batch-executor';
import {
  ChatMetadata,
  UserSettings,
  OperationLog,
  PlatformId,
  ClassificationCategory,
  ActionResult,
} from '../types';
import { DEFAULT_SETTINGS, INITIAL_STORAGE_STATE } from '../storage/schema';
import {
  MessageSquare,
  Trash2,
  HelpCircle,
  Shield,
  Layers,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [platformStatus, setPlatformStatus] = useState(INITIAL_STORAGE_STATE.platformStatus);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [isScanning, setIsScanning] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filters & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ClassificationCategory | 'all'>('all');
  const [protectedOnly, setProtectedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'confidence'>('date');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Confirmation Modal & Batch Progress
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    chats: ChatMetadata[];
    action: 'archive' | 'delete' | 'dry_run';
    isDryRun: boolean;
  }>({
    isOpen: false,
    chats: [],
    action: 'delete',
    isDryRun: true,
  });

  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentChatTitle?: string;
    result?: ActionResult;
    isComplete?: boolean;
    cancelled?: boolean;
  } | null>(null);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'general' | 'exclusions' | 'data'>('general');

  // Load initial data
  const loadData = async () => {
    const state = await StorageManager.getState();
    setSettings(state.settings);
    setChats(Object.values(state.chats));
    setLogs(state.operationLogs);
    setPlatformStatus(state.platformStatus);

    // Check if onboarding is needed
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'true' || !state.settings.onboardingCompleted) {
      setOnboardingOpen(true);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for background batch messages
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg.type === 'BATCH_PROGRESS') {
          setBatchProgress({
            current: msg.current,
            total: msg.total,
            currentChatTitle: msg.currentChat,
            result: msg.result,
            isComplete: msg.isComplete,
            cancelled: msg.cancelled,
          });
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const handleUpdateSettings = async (partial: Partial<UserSettings>) => {
    const updated = await StorageManager.updateSettings(partial);
    setSettings(updated);

    // Re-evaluate chats with new thresholds/exclusions
    const reclassified = ClassificationEngine.classifyBatch(chats, updated);
    await StorageManager.saveChats(reclassified);
    setChats(reclassified);
  };

  const handleCloseOnboarding = async () => {
    setOnboardingOpen(false);
    await handleUpdateSettings({ onboardingCompleted: true });
  };

  // Trigger scan
  const handleTriggerScan = async (targetPlatform?: PlatformId) => {
    setIsScanning(true);
    setBannerNotice(null);

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response: any = await chrome.runtime.sendMessage({
          type: 'TRIGGER_SCAN',
          platform: targetPlatform,
        });

        if (response && response.success) {
          setBannerNotice({
            type: 'success',
            message: `Scan complete: Discovered and classified ${response.count} conversations on ${response.platform || 'platform'}!`,
          });
          await loadData();
        } else {
          setBannerNotice({
            type: 'info',
            message:
              response?.error ||
              'Open ChatGPT, Gemini, or Claude in an active browser tab, then click Scan.',
          });
        }
      } else {
        // Mock fallback if running in standalone dev mode
        setBannerNotice({
          type: 'info',
          message: 'Running in standalone preview mode. Loaded local conversation state.',
        });
      }
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Error communicating with extension background worker.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Chat classification & status handlers
  const handleToggleProtection = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const newProtected = !chat.isProtected;
    const updated = await StorageManager.updateChat(chatId, {
      isProtected: newProtected,
      category: newProtected ? 'keep' : chat.category,
    });

    if (updated) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
      // Also update settings.protectedChatIds
      let ids = [...settings.protectedChatIds];
      if (newProtected) ids.push(chatId);
      else ids = ids.filter((id) => id !== chatId);
      await StorageManager.updateSettings({ protectedChatIds: ids });
    }
  };

  const handleChangeCategory = async (chatId: string, category: ClassificationCategory) => {
    const updated = await StorageManager.updateChat(chatId, {
      category,
      userOverrideCategory: category,
    });
    if (updated) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
    }
  };

  const handleDismiss = async (chatId: string) => {
    await handleChangeCategory(chatId, 'keep');
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectable = filteredChats
      .filter((c) => !c.isProtected && c.status !== 'deleted')
      .map((c) => c.id);
    setSelectedIds(selectable);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Bulk & Single Action Handlers
  const handleTriggerDryRun = () => {
    const targetChats = chats.filter((c) => selectedIds.includes(c.id));
    setConfirmModal({
      isOpen: true,
      chats: targetChats,
      action: 'dry_run',
      isDryRun: true,
    });
  };

  const handleTriggerBulkDelete = () => {
    const targetChats = chats.filter((c) => selectedIds.includes(c.id));
    setConfirmModal({
      isOpen: true,
      chats: targetChats,
      action: 'delete',
      isDryRun: settings.dryRunDefault,
    });
  };

  const handleTriggerBulkArchive = () => {
    const targetChats = chats.filter((c) => selectedIds.includes(c.id));
    setConfirmModal({
      isOpen: true,
      chats: targetChats,
      action: 'archive',
      isDryRun: settings.dryRunDefault,
    });
  };

  const handleSingleDelete = (chat: ChatMetadata) => {
    setConfirmModal({
      isOpen: true,
      chats: [chat],
      action: 'delete',
      isDryRun: settings.dryRunDefault,
    });
  };

  // Execute batch from modal
  const handleConfirmBatch = async () => {
    setIsBatchProcessing(true);
    setBatchProgress({
      current: 0,
      total: confirmModal.chats.length,
      currentChatTitle: confirmModal.chats[0]?.title,
      isComplete: false,
    });

    try {
      const result = await SafeBatchExecutor.executeBatch(
        confirmModal.chats,
        confirmModal.action === 'archive' ? 'archive' : 'delete',
        confirmModal.isDryRun,
        settings,
        (p) => setBatchProgress(p)
      );

      setBannerNotice({
        type: 'success',
        message: confirmModal.isDryRun
          ? `Dry-Run completed successfully: ${result.results.length} conversation(s) simulated.`
          : `Batch executed: ${result.results.filter((r) => r.success).length} of ${result.results.length} operations completed safely.`,
      });

      setSelectedIds([]);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await loadData();
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Batch execution stopped.',
      });
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(null);
    }
  };

  const handleCancelBatch = () => {
    SafeBatchExecutor.cancel();
  };

  // Filtered & Sorted Chats
  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        if (selectedPlatform !== 'all' && chat.platform !== selectedPlatform) return false;
        if (selectedCategory !== 'all' && chat.category !== selectedCategory) return false;
        if (protectedOnly && !chat.isProtected) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return chat.title.toLowerCase().includes(q) || chat.reasons.some((r) => r.toLowerCase().includes(q));
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'confidence') return b.confidence - a.confidence;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        // Default: date (fallback to lastScannedAt)
        return (b.lastActivityTimestamp || b.lastScannedAt) - (a.lastActivityTimestamp || a.lastScannedAt);
      });
  }, [chats, selectedPlatform, selectedCategory, protectedOnly, searchQuery, sortBy]);

  // Review Queue Items (Needs Review or Cleanup Candidate)
  const reviewQueueChats = useMemo(() => {
    return chats.filter((c) => (c.category === 'review' || c.category === 'cleanup') && c.status !== 'deleted');
  }, [chats]);

  // Stats
  const cleanupCandidatesCount = chats.filter((c) => c.category === 'cleanup' && c.status !== 'deleted').length;
  const reviewCount = chats.filter((c) => c.category === 'review' && c.status !== 'deleted').length;
  const protectedCount = chats.filter((c) => c.isProtected).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTriggerScan={() => handleTriggerScan()}
        isScanning={isScanning}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        platformStatus={platformStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Notice */}
        {bannerNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : bannerNotice.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {bannerNotice.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : bannerNotice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span>{bannerNotice.message}</span>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Discovered"
                value={chats.length}
                subtitle="All tracked AI conversations"
                icon={<MessageSquare className="w-5 h-5 text-brand-400" />}
                accentColor="brand"
                onClick={() => setActiveTab('manager')}
              />
              <StatCard
                title="Cleanup Candidates"
                value={cleanupCandidatesCount}
                subtitle="Low-value, empty, or test chats"
                icon={<Trash2 className="w-5 h-5 text-rose-400" />}
                accentColor="rose"
                onClick={() => {
                  setSelectedCategory('cleanup');
                  setActiveTab('manager');
                }}
              />
              <StatCard
                title="Awaiting Review"
                value={reviewCount}
                subtitle="Flagged for manual inspection"
                icon={<HelpCircle className="w-5 h-5 text-amber-400" />}
                accentColor="amber"
                onClick={() => setActiveTab('review')}
              />
              <StatCard
                title="Protected Chats"
                value={protectedCount}
                subtitle="Immune from deletion"
                icon={<Shield className="w-5 h-5 text-emerald-400" />}
                accentColor="brand"
                onClick={() => {
                  setProtectedOnly(true);
                  setActiveTab('manager');
                }}
              />
            </div>

            {/* Platform Connections Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  Supported Chat Platforms
                </h4>
                <span className="text-xs text-slate-400">
                  Open platform tabs to scan & discover chats
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlatformStatusCard
                  platform="chatgpt"
                  name="ChatGPT"
                  url="https://chatgpt.com"
                  connected={platformStatus.chatgpt.connected}
                  totalDiscovered={chats.filter((c) => c.platform === 'chatgpt').length}
                  lastScanTimestamp={platformStatus.chatgpt.lastScanTimestamp}
                  onScan={(p) => handleTriggerScan(p)}
                  isScanning={isScanning}
                />
                <PlatformStatusCard
                  platform="gemini"
                  name="Google Gemini"
                  url="https://gemini.google.com"
                  connected={platformStatus.gemini.connected}
                  totalDiscovered={chats.filter((c) => c.platform === 'gemini').length}
                  lastScanTimestamp={platformStatus.gemini.lastScanTimestamp}
                  onScan={(p) => handleTriggerScan(p)}
                  isScanning={isScanning}
                />
                <PlatformStatusCard
                  platform="claude"
                  name="Anthropic Claude"
                  url="https://claude.ai"
                  connected={platformStatus.claude.connected}
                  totalDiscovered={chats.filter((c) => c.platform === 'claude').length}
                  lastScanTimestamp={platformStatus.claude.lastScanTimestamp}
                  onScan={(p) => handleTriggerScan(p)}
                  isScanning={isScanning}
                />
              </div>
            </div>

            {/* Audit & Operation Trail */}
            <RecentActivity logs={logs} />
          </div>
        )}

        {/* Tab 2: Conversation Manager */}
        {activeTab === 'manager' && (
          <div className="space-y-4">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedPlatform={selectedPlatform}
              onPlatformChange={setSelectedPlatform}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              protectedOnly={protectedOnly}
              onToggleProtectedOnly={() => setProtectedOnly((p) => !p)}
            />

            <ConversationTable
              chats={filteredChats}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onToggleProtection={handleToggleProtection}
              onChangeCategory={handleChangeCategory}
              onSingleDelete={handleSingleDelete}
            />

            <BulkActionBar
              selectedCount={selectedIds.length}
              onClearSelection={handleDeselectAll}
              onTriggerDryRun={handleTriggerDryRun}
              onTriggerArchive={handleTriggerBulkArchive}
              onTriggerDelete={handleTriggerBulkDelete}
              supportsArchive={selectedPlatform === 'chatgpt'}
              isProcessing={isBatchProcessing}
            />
          </div>
        )}

        {/* Tab 3: Review Queue */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-base font-semibold text-white">Review Queue</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect flagged conversations, understand why they were categorized, and make decisions.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                {reviewQueueChats.length} items to review
              </span>
            </div>

            {reviewQueueChats.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h5 className="font-semibold text-sm text-white">Review Queue is Clean!</h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No conversations are currently flagged for review or cleanup. Run a new scan whenever you wish.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewQueueChats.map((chat) => (
                  <ReviewCard
                    key={chat.id}
                    chat={chat}
                    onKeep={(id) => handleChangeCategory(id, 'keep')}
                    onDismiss={handleDismiss}
                    onMarkCleanup={(id) => handleChangeCategory(id, 'cleanup')}
                    onToggleProtect={handleToggleProtection}
                    onDeleteSingle={handleSingleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Settings sub-tabs */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <button
                onClick={() => setSettingsSection('general')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  settingsSection === 'general'
                    ? 'bg-slate-800 text-brand-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Safety & General
              </button>
              <button
                onClick={() => setSettingsSection('exclusions')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  settingsSection === 'exclusions'
                    ? 'bg-slate-800 text-brand-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Protected Exclusions
              </button>
              <button
                onClick={() => setSettingsSection('data')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  settingsSection === 'data'
                    ? 'bg-slate-800 text-brand-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Privacy & Data
              </button>
            </div>

            {settingsSection === 'general' && (
              <GeneralSettings settings={settings} onUpdate={handleUpdateSettings} />
            )}
            {settingsSection === 'exclusions' && (
              <ExclusionsManager settings={settings} onUpdate={handleUpdateSettings} />
            )}
            {settingsSection === 'data' && (
              <DataManagement
                settings={settings}
                onUpdate={handleUpdateSettings}
                onDataReset={loadData}
              />
            )}
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        chats={confirmModal.chats}
        action={confirmModal.action}
        isDryRun={confirmModal.isDryRun}
        onToggleDryRun={(v) => setConfirmModal((prev) => ({ ...prev, isDryRun: v }))}
        onConfirm={handleConfirmBatch}
        isProcessing={isBatchProcessing}
        progress={batchProgress}
        onCancelBatch={handleCancelBatch}
      />

      {/* Onboarding Safety Modal */}
      <OnboardingModal isOpen={onboardingOpen} onClose={handleCloseOnboarding} />
    </div>
  );
};
