import React, { useState } from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import { Switch } from '../Common/Switch';
import { PlatformMark, PLATFORM_META } from '../Common/PlatformMark';
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

  const platforms = Array.from(new Set(chats.map((c) => c.platform)))
    .map((p) => PLATFORM_META[p]?.shortName ?? p)
    .join(', ');
  const noun = `${chats.length} conversation${chats.length === 1 ? '' : 's'}`;
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const handleClose = () => {
    if (isProcessing) return;
    setConfirmedCheckbox(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isDryRun ? 'Run a dry run' : action === 'delete' ? `Delete ${noun}?` : `Archive ${noun}?`}
      description={
        isDryRun
          ? 'Checks each conversation can be found and acted on. Nothing is changed.'
          : 'Review the list below before continuing.'
      }
      maxWidth="xl"
    >
      <div className="space-y-5 text-[15px]">
        {isDryRun ? (
          <div className="flex items-start gap-3 rounded-xl bg-accent-soft p-4 text-accent-text">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <p>Simulation only. Your conversations stay exactly as they are.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl bg-danger-soft p-4 text-danger-text">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>
              {action === 'delete'
                ? 'Deleted conversations are removed from the platform and cannot be recovered.'
                : 'Archived conversations are hidden from the platform sidebar.'}
            </p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-medium">{noun}</p>
            <p className="text-sm text-fg-muted">{platforms}</p>
          </div>
          <ul className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {chats.map((chat) => (
              <li key={chat.id} className="flex items-center gap-3 px-3 py-2.5">
                <PlatformMark platform={chat.platform} size="sm" />
                <span className="truncate">{chat.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-3">
          <div>
            <p className="font-medium">Dry run only</p>
            <p className="text-sm text-fg-muted">Recommended before any real deletion.</p>
          </div>
          <Switch checked={isDryRun} onChange={onToggleDryRun} disabled={isProcessing} label="Dry run only" />
        </div>

        {!isDryRun && action === 'delete' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-danger/40 px-4 py-3">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmedCheckbox}
              onChange={(e) => setConfirmedCheckbox(e.target.checked)}
              disabled={isProcessing}
            />
            <span>I understand {noun} will be permanently deleted.</span>
          </label>
        )}

        {isProcessing && progress && (
          <div className="space-y-2 rounded-lg border border-border p-4" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Processing {progress.current} of {progress.total}
              </span>
              <span className="text-fg-muted tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            {progress.currentChatTitle && (
              <p className="truncate text-sm text-fg-muted">{progress.currentChatTitle}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          {isProcessing ? (
            <Button variant="danger" size="md" onClick={onCancelBatch}>
              Stop batch
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant={isDryRun ? 'primary' : 'danger'}
                size="md"
                onClick={onConfirm}
                disabled={!isDryRun && action === 'delete' && !confirmedCheckbox}
              >
                {isDryRun ? 'Start dry run' : action === 'delete' ? `Delete ${noun}` : `Archive ${noun}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
