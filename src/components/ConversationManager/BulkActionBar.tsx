import React from 'react';
import { Button } from '../Common/Button';
import { Shield, Trash2, Archive, X } from 'lucide-react';

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
    <div className="sticky bottom-4 z-30 mx-auto max-w-4xl p-3 px-5 rounded-2xl border border-brand-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-mono text-xs flex items-center justify-center font-bold">
          {selectedCount}
        </span>
        <span className="text-xs text-slate-200 font-medium">
          {selectedCount === 1 ? '1 conversation selected' : `${selectedCount} conversations selected`}
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 pl-2 border-l border-slate-700"
        >
          <X className="w-3.5 h-3.5" />
          Deselect
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onTriggerDryRun}
          disabled={isProcessing}
          icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
        >
          Dry-Run Test
        </Button>

        {supportsArchive && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onTriggerArchive}
            disabled={isProcessing}
            icon={<Archive className="w-3.5 h-3.5 text-blue-400" />}
          >
            Archive
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          onClick={onTriggerDelete}
          disabled={isProcessing}
          icon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Delete Selected...
        </Button>
      </div>
    </div>
  );
};
