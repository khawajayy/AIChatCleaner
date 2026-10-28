import React, { useState } from 'react';
import { Card, CardHeader } from '../Common/Card';
import { Button } from '../Common/Button';
import { StorageManager } from '../../storage/storage-manager';
import { StorageClient } from '../../storage/storage-client';
import { Download, Trash2, HardDrive, Database } from 'lucide-react';

interface DataManagementProps {
  onDataReset: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ onDataReset }) => {
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
    await StorageClient.resetAllData();
    setShowResetConfirm(false);
    onDataReset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={<HardDrive />} title="Where your data lives" />
        <ul className="space-y-2.5 text-[15px] text-fg-muted">
          <li>
            Conversation titles, classifications and the activity log are kept in{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm text-fg">chrome.storage.local</code>.
          </li>
          <li>Nothing is uploaded. There is no analytics or tracking code.</li>
          <li>The rule-based classifier runs locally and needs no API key.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader icon={<Database />} title="Export and reset" />
        <div className="divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-[15px] font-medium">Export your data</p>
              <p className="text-sm text-fg-muted">Settings, rules and scanned metadata as a JSON file.</p>
            </div>
            <Button variant="secondary" size="md" onClick={handleExport} isLoading={isExporting} icon={<Download />}>
              Export JSON
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-[15px] font-medium text-danger-text">Reset all data</p>
              <p className="text-sm text-fg-muted">Clears scanned chats and history, and restores default settings.</p>
            </div>
            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="md" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="md" onClick={handleConfirmReset}>
                  Yes, reset everything
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="md" onClick={() => setShowResetConfirm(true)} icon={<Trash2 />}>
                Reset data
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
