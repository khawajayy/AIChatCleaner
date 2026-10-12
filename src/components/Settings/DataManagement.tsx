import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { UserSettings } from '../../types';
import { StorageManager } from '../../storage/storage-manager';
import { Download, Trash2, ShieldCheck, Cpu } from 'lucide-react';

interface DataManagementProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
  onDataReset: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  settings,
  onUpdate,
  onDataReset,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await StorageManager.exportDataJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatsweep_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmReset = async () => {
    await StorageManager.resetAllData();
    setShowResetConfirm(false);
    onDataReset();
  };

  return (
    <div className="space-y-6">
      {/* Privacy & Zero-Knowledge Guarantee */}
      <Card className="border-brand-500/20 bg-brand-950/10">
        <div className="flex items-center gap-2 pb-3 border-b border-brand-500/20">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <h5 className="font-semibold text-sm text-brand-200">Local Privacy Architecture</h5>
        </div>

        <div className="mt-3 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            • All conversation metadata, classifications, and audit logs are stored strictly inside your browser's local storage (<code className="font-mono text-brand-400">chrome.storage.local</code>).
          </p>
          <p>
            • <strong>Zero bytes leave your computer:</strong> No transcripts are uploaded to remote servers, no third-party tracking or telemetry is bundled.
          </p>
          <p>
            • No API keys are required for the rule-based classification engine.
          </p>
        </div>
      </Card>

      {/* Optional AI Classification Feature Flag */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-purple-400" />
          <h5 className="font-semibold text-sm text-white">AI-Powered Classification (Optional Future Opt-In)</h5>
        </div>

        <div className="mt-3 text-xs text-slate-300 space-y-3">
          <p className="text-slate-400">
            By default, ChatSweep relies exclusively on fast, transparent on-device heuristics. If enabled in a future release, AI classification will require your explicit provider choice and consent before any metadata is evaluated.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="font-semibold text-slate-200">Opt-in to experimental AI classifier</span>
              <p className="text-[11px] text-slate-500">Currently disabled by default. Strict opt-in.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.aiClassificationOptIn}
              onChange={(e) => onUpdate({ aiClassificationOptIn: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800 text-purple-500 focus:ring-purple-400 cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* Data Export & Reset */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Download className="w-4 h-4 text-slate-400" />
          <h5 className="font-semibold text-sm text-white">Data Export & Reset</h5>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-200">Export Settings & Scan History</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Download your configured exclusions, thresholds, and discovered chat metadata as a JSON file.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            isLoading={isExporting}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-850 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-rose-300">Clear Local Storage Data</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Permanently clears stored chats, scan history, and resets settings to defaults.
            </p>
          </div>

          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmReset}>
                Yes, Reset All Data
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            >
              Reset Data
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
