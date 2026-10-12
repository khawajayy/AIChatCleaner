import React, { useState } from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import { ChatMetadata, ActionResult } from '../../types';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatMetadata[];
  action: 'archive' | 'delete' | 'dry_run';
  isDryRun: boolean;
  onToggleDryRun: (v: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  progress?: {
    current: number;
    total: number;
    currentChatTitle?: string;
    result?: ActionResult;
    isComplete?: boolean;
    cancelled?: boolean;
  } | null;
  onCancelBatch: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  chats,
  action,
  isDryRun,
  onToggleDryRun,
  onConfirm,
  isProcessing,
  progress,
  onCancelBatch,
}) => {
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);

  // Derive platforms involved
  const platforms = Array.from(new Set(chats.map((c) => c.platform))).join(', ');

  const handleClose = () => {
    if (isProcessing) return; // Do not close while executing
    setConfirmedCheckbox(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isDryRun
          ? 'Preview Action (Dry-Run Mode)'
          : action === 'delete'
          ? 'Confirm Permanent Deletion'
          : 'Confirm Archive'
      }
      description={
        isDryRun
          ? 'Simulate and verify the target operation safely without modifying your account.'
          : 'Destructive operation: Review the list of targeted conversations carefully.'
      }
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Safety Banner */}
        {isDryRun ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-200">Dry-Run Protection Enabled:</span>{' '}
              ChatSweep will verify DOM identifiers and emulate the process. Zero conversations will be modified or deleted.
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold text-rose-200">Irreversible Action:</span>{' '}
              Deleting conversations permanently removes them from the platform. The platform cannot undo this deletion.
            </div>
          </div>
        )}

        {/* Summary Info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="text-slate-400">Total Selected:</span>
            <p className="font-mono font-bold text-sm text-white mt-0.5">{chats.length} chats</p>
          </div>
          <div>
            <span className="text-slate-400">Platform(s):</span>
            <p className="font-mono font-semibold text-xs text-brand-400 mt-0.5 uppercase">{platforms}</p>
          </div>
        </div>

        {/* Conversation Titles List */}
        <div>
          <label className="text-slate-400 font-medium block mb-1.5">
            Selected Conversations ({chats.length}):
          </label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-2 divide-y divide-slate-850">
            {chats.map((chat) => (
              <div key={chat.id} className="py-1.5 px-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-medium truncate max-w-sm">{chat.title}</span>
                <span className="text-slate-500 uppercase font-mono text-[10px]">{chat.platform}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dry-Run Checkbox Toggle inside Dialog */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="toggle-dry-run-modal"
            type="checkbox"
            checked={isDryRun}
            onChange={(e) => onToggleDryRun(e.target.checked)}
            disabled={isProcessing}
            className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-400"
          />
          <label htmlFor="toggle-dry-run-modal" className="text-slate-300 cursor-pointer">
            Execute as Dry-Run simulation only (Recommended first)
          </label>
        </div>

        {/* For Live Deletions: Extra acknowledgment checkbox */}
        {!isDryRun && action === 'delete' && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
            <input
              id="confirm-destructive"
              type="checkbox"
              checked={confirmedCheckbox}
              onChange={(e) => setConfirmedCheckbox(e.target.checked)}
              disabled={isProcessing}
              className="rounded border-rose-700 bg-rose-950 text-rose-500 focus:ring-rose-400"
            />
            <label htmlFor="confirm-destructive" className="text-rose-200 cursor-pointer font-medium">
              I understand that {chats.length} conversation(s) will be permanently deleted.
            </label>
          </div>
        )}

        {/* Progress Bar during active execution */}
        {isProcessing && progress && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">
                Processing {progress.current} of {progress.total}...
              </span>
              <span className="text-brand-400">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.currentChatTitle && (
              <p className="text-[11px] text-slate-400 truncate">
                Current: <span className="text-slate-200">{progress.currentChatTitle}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          {isProcessing ? (
            <Button variant="danger" size="sm" onClick={onCancelBatch}>
              Cancel In-Flight Batch
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant={isDryRun ? 'primary' : 'danger'}
                size="sm"
                onClick={onConfirm}
                disabled={!isDryRun && action === 'delete' && !confirmedCheckbox}
              >
                {isDryRun
                  ? 'Run Dry-Run Preview'
                  : action === 'delete'
                  ? `Permanently Delete ${chats.length} Chat(s)`
                  : `Archive ${chats.length} Chat(s)`}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
