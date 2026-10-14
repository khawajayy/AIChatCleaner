import React from 'react';
import { Button } from '../Common/Button';
import { FlaskConical, Trash2, Archive, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onTriggerDryRun: () => void;
  onTriggerArchive: () => void;
  onTriggerDelete: () => void;
  supportsArchive: boolean;
  isProcessing: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onTriggerDryRun,
  onTriggerArchive,
  onTriggerDelete,
  supportsArchive,
  isProcessing,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-6 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-pop animate-slide-up">
      <div className="flex items-center gap-3">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-accent px-2 text-sm font-semibold text-accent-fg tabular-nums">
          {selectedCount}
        </span>
        <span className="text-[15px] font-medium">selected</span>
        <button
          type="button"
          onClick={onClearSelection}
          className="inline-flex items-center gap-1 rounded-md px-2 h-8 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="md" onClick={onTriggerDryRun} disabled={isProcessing} icon={<FlaskConical />}>
          Dry run
        </Button>
        {supportsArchive && (
          <Button variant="secondary" size="md" onClick={onTriggerArchive} disabled={isProcessing} icon={<Archive />}>
            Archive
          </Button>
        )}
        <Button variant="danger" size="md" onClick={onTriggerDelete} disabled={isProcessing} icon={<Trash2 />}>
          Delete…
        </Button>
      </div>
    </div>
  );
};
