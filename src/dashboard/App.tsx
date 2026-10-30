import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, TopBar, DashboardTab, NAV_ITEMS } from '../components/Layout/Navbar';
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
import { PLATFORM_META } from '../components/Common/PlatformMark';
import { StorageManager } from '../storage/storage-manager';
import { StorageClient, onStorageChanged } from '../storage/storage-client';
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
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

function tabFromHash(): DashboardTab {
  const hash = window.location.hash.slice(1);
  return NAV_ITEMS.some((n) => n.id === hash) ? (hash as DashboardTab) : 'dashboard';
}

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'Safety & general' },
  { id: 'exclusions', label: 'Protection rules' },
  { id: 'data', label: 'Privacy & data' },
] as const;

export const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [platformStatus, setPlatformStatus] = useState(INITIAL_STORAGE_STATE.platformStatus);
  // The current page lives in the URL hash so pages can be linked to and Back works.
  const [activeTab, setActiveTabState] = useState<DashboardTab>(tabFromHash);
  const setActiveTab = (tab: DashboardTab) => {
    setActiveTabState(tab);
    if (window.location.hash !== `#${tab}`) window.location.hash = tab;
  };
  useEffect(() => {
    const onHashChange = () => setActiveTabState(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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

  // Read the stored state. Writes go through the background worker (StorageClient)
  // and come back here via the storage change listener.
  const loadData = async () => {
    const state = await StorageManager.getState();
    setSettings(state.settings);
    // Chats the last scan of their platform no longer listed stay stored but are not shown
    setChats(Object.values(state.chats).filter((c) => !c.missingSince));
    setLogs(state.operationLogs);
    setPlatformStatus(state.platformStatus);
    return state;
  };

  useEffect(() => {
    loadData().then((state) => {
      // Check if onboarding is needed
      const params = new URLSearchParams(window.location.search);
      if (params.get('onboarding') === 'true' || !state.settings.onboardingCompleted) {
        setOnboardingOpen(true);
      }
    });
    const unsubscribeStorage = onStorageChanged(() => {
      loadData();
    });

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
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
        unsubscribeStorage();
      };
    }
    return unsubscribeStorage;
  }, []);

  const handleUpdateSettings = async (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    // The worker re-evaluates the stored chats with the new thresholds/exclusions
    const updated = await StorageClient.updateSettings(partial, { reclassify: true });
    setSettings(updated);
    await loadData();
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

    // Set the state the user sees flipped, rather than toggling whatever storage holds
    const updated = await StorageClient.setChatProtection(chatId, !chat.isProtected);
    if (updated) {
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
      await loadData();
    }
  };

  const handleChangeCategory = async (chatId: string, category: ClassificationCategory) => {
    const updated = await StorageClient.setChatCategory(chatId, category);
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

    const action = confirmModal.action === 'archive' ? 'archive' : 'delete';
    const isDryRun = confirmModal.isDryRun;
    const requested = confirmModal.chats;

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        throw new Error('Extension messaging is unavailable. Open the dashboard from the extension.');
      }

      // The background worker owns the batch and runs each action in the chat tab.
      const response: any = await chrome.runtime.sendMessage({
        type: 'EXECUTE_BATCH',
        chatIds: requested.map((c) => c.id),
        action,
        dryRun: isDryRun,
      });
      if (!response?.success) throw new Error(response?.error || 'The batch could not start.');

      const results: ActionResult[] = response.results ?? [];
      const succeeded = results.filter((r) => r.success);
      const firstFailure = results.find((r) => !r.success);
      const failedTitle = firstFailure ? requested.find((c) => c.id === firstFailure.chatId)?.title : undefined;
      const truncated = results.length < requested.length && !response.cancelled && !response.stoppedOnError;
      const verb = action === 'delete' ? 'Deleted' : 'Archived';
      const noun = (n: number) => `${n} conversation${n === 1 ? '' : 's'}`;
      const limitNote = truncated ? ` Only the first ${results.length} ran because of the batch size limit.` : '';

      if (response.cancelled) {
        setBannerNotice({ type: 'info', message: `Stopped. ${succeeded.length} of ${requested.length} finished before you cancelled.` });
      } else if (isDryRun) {
        setBannerNotice(
          firstFailure
            ? {
                type: 'error',
                message: `Dry run: ${succeeded.length} of ${results.length} would work. "${failedTitle ?? firstFailure.chatId}": ${firstFailure.error}`,
              }
            : { type: 'success', message: `Dry run passed for ${noun(results.length)}. Nothing was changed.${limitNote}` }
        );
      } else if (firstFailure) {
        setBannerNotice({
          type: 'error',
          message: `${verb} ${succeeded.length} of ${results.length}, then stopped for safety. "${failedTitle ?? firstFailure.chatId}": ${firstFailure.error}`,
        });
      } else {
        setBannerNotice({ type: 'success', message: `${verb} ${noun(succeeded.length)}.${limitNote}` });
      }

      // Keep anything that didn't go through selected so it can be retried
      const done = new Set(isDryRun ? [] : succeeded.map((r) => r.chatId));
      setSelectedIds((prev) => (isDryRun && !firstFailure ? prev : prev.filter((id) => !done.has(id))));
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
    chrome.runtime?.sendMessage?.({ type: 'CANCEL_BATCH' }).catch(() => {});
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


  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      <Sidebar
        settings={settings}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        reviewCount={reviewQueueChats.length}
        platformStatus={platformStatus}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onTriggerScan={() => handleTriggerScan()}
          isScanning={isScanning}
          reviewCount={reviewQueueChats.length}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-6 lg:px-10 py-8 space-y-8">
          <p className="-mt-2 text-[15px] text-fg-muted">{currentNav.description}</p>

          {bannerNotice && (
            <div
              role="status"
              className={`flex items-start gap-3 rounded-xl px-4 py-3.5 text-[15px] animate-fade-in ${
                bannerNotice.type === 'success'
                  ? 'bg-accent-soft text-accent-text'
                  : bannerNotice.type === 'error'
                  ? 'bg-danger-soft text-danger-text'
                  : 'bg-info-soft text-info-text'
              }`}
            >
              {bannerNotice.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              ) : bannerNotice.type === 'error' ? (
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
              ) : (
                <Info className="mt-0.5 size-5 shrink-0" />
              )}
              <span className="flex-1">{bannerNotice.message}</span>
              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                aria-label="Dismiss notice"
                className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100"
              >
                <X className="size-5" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                  title="Total chats"
                  value={chats.length}
                  subtitle="Across all platforms"
                  icon={<MessageSquare />}
                  accentColor="brand"
                  onClick={() => setActiveTab('manager')}
                />
                <StatCard
                  title="To clean up"
                  value={cleanupCandidatesCount}
                  subtitle="Empty or throwaway chats"
                  icon={<Trash2 />}
                  accentColor="rose"
                  onClick={() => {
                    setSelectedCategory('cleanup');
                    setActiveTab('manager');
                  }}
                />
                <StatCard
                  title="Needs review"
                  value={reviewCount}
                  subtitle="Flagged for a manual look"
                  icon={<HelpCircle />}
                  accentColor="amber"
                  onClick={() => setActiveTab('review')}
                />
                <StatCard
                  title="Protected"
                  value={protectedCount}
                  subtitle="Never deleted"
                  icon={<Shield />}
                  accentColor="blue"
                  onClick={() => {
                    setProtectedOnly(true);
                    setActiveTab('manager');
                  }}
                />
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Platforms</h2>
                  <p className="text-sm text-fg-muted">Keep the site open in a tab, then scan it.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => (
                    <PlatformStatusCard
                      key={p}
                      platform={p}
                      name={PLATFORM_META[p].name}
                      url={PLATFORM_META[p].url}
                      connected={platformStatus[p].connected}
                      totalDiscovered={chats.filter((c) => c.platform === p).length}
                      lastScanTimestamp={platformStatus[p].lastScanTimestamp}
                      onScan={(target) => handleTriggerScan(target)}
                      isScanning={isScanning}
                    />
                  ))}
                </div>
              </section>

              <RecentActivity logs={logs} />
            </div>
          )}

          {activeTab === 'manager' && (
            <div className="space-y-5">
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

          {activeTab === 'review' && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">
                {reviewQueueChats.length} conversation{reviewQueueChats.length === 1 ? '' : 's'} to review
              </h2>

              {reviewQueueChats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">You're all caught up</h3>
                  <p className="mx-auto mt-1 max-w-md text-[15px] text-fg-muted">
                    Nothing is flagged right now. Run a new scan whenever you want to check again.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-border">
                {SETTINGS_SECTIONS.map(({ id, label }) => {
                  const active = settingsSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSettingsSection(id)}
                      className={`-mb-px whitespace-nowrap border-b-2 px-4 h-11 text-[15px] font-medium transition-colors ${
                        active
                          ? 'border-accent text-fg'
                          : 'border-transparent text-fg-muted hover:text-fg hover:border-border-strong'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="max-w-3xl">
                {settingsSection === 'general' && (
                  <GeneralSettings settings={settings} onUpdate={handleUpdateSettings} />
                )}
                {settingsSection === 'exclusions' && (
                  <ExclusionsManager settings={settings} onUpdate={handleUpdateSettings} />
                )}
                {settingsSection === 'data' && (
                  <DataManagement onDataReset={loadData} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

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

      <OnboardingModal isOpen={onboardingOpen} onClose={handleCloseOnboarding} />
    </div>
  );
};
