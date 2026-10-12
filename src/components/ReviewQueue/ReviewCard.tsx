import React from 'react';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { Button } from '../Common/Button';
import { ChatMetadata } from '../../types';
import {
  ExternalLink,
  CheckCircle,
  Trash2,
  Lock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ReviewCardProps {
  chat: ChatMetadata;
  onKeep: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkCleanup: (id: string) => void;
  onToggleProtect: (id: string) => void;
  onDeleteSingle: (chat: ChatMetadata) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  chat,
  onKeep,
  onDismiss,
  onMarkCleanup,
  onToggleProtect,
  onDeleteSingle,
}) => {
  return (
    <Card className="flex flex-col justify-between border-slate-800 hover:border-slate-700">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {chat.platform}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">
                Confidence: <span className="font-bold text-white">{Math.round(chat.confidence * 100)}%</span>
              </span>
            </div>
            <a
              href={chat.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-white hover:text-brand-400 flex items-center gap-1.5 group"
            >
              <span className="truncate">{chat.title}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 shrink-0" />
            </a>
          </div>

          <div>
            {chat.category === 'cleanup' ? (
              <Badge variant="rose" size="sm">
                <Trash2 className="w-3 h-3 text-rose-400" />
                Cleanup Candidate
              </Badge>
            ) : (
              <Badge variant="amber" size="sm">
                <HelpCircle className="w-3 h-3 text-amber-400" />
                Needs Review
              </Badge>
            )}
          </div>
        </div>

        {/* Explainability Breakdown */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Why this was flagged:
          </span>
          {chat.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
              <AlertCircle className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleProtect(chat.id)}
            title={chat.isProtected ? 'Protected' : 'Protect conversation'}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              chat.isProtected
                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px]">{chat.isProtected ? 'Protected' : 'Protect'}</span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(chat.id)}
            className="text-xs text-slate-400"
          >
            Dismiss
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onKeep(chat.id)}
            icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Keep Chat
          </Button>

          {chat.category !== 'cleanup' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkCleanup(chat.id)}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            >
              Mark for Cleanup
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDeleteSingle(chat)}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
