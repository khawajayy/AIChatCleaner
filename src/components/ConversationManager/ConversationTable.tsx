import React from 'react';
import { ChatMetadata, ClassificationCategory } from '../../types';
import { Badge } from '../Common/Badge';
import {
  ExternalLink,
  Trash2,
  CheckCircle,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react';

interface ConversationTableProps {
  chats: ChatMetadata[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleProtection: (id: string) => void;
  onChangeCategory: (id: string, cat: ClassificationCategory) => void;
  onSingleDelete: (chat: ChatMetadata) => void;
}

export const ConversationTable: React.FC<ConversationTableProps> = ({
  chats,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onToggleProtection,
  onChangeCategory,
  onSingleDelete,
}) => {
  // Selectable chats are those that are NOT protected
  const selectableChats = chats.filter((c) => !c.isProtected && c.status !== 'deleted');
  const allSelectableChosen =
    selectableChats.length > 0 && selectableChats.every((c) => selectedIds.includes(c.id));

  const getCategoryBadge = (cat: ClassificationCategory, confidence: number) => {
    switch (cat) {
      case 'cleanup':
        return (
          <Badge variant="rose" size="sm">
            <Trash2 className="w-3 h-3 text-rose-400" />
            Cleanup ({Math.round(confidence * 100)}%)
          </Badge>
        );
      case 'review':
        return (
          <Badge variant="amber" size="sm">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            Review ({Math.round(confidence * 100)}%)
          </Badge>
        );
      case 'keep':
      default:
        return (
          <Badge variant="green" size="sm">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Keep ({Math.round(confidence * 100)}%)
          </Badge>
        );
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'chatgpt':
        return (
          <Badge variant="green" size="sm">
            ChatGPT
          </Badge>
        );
      case 'gemini':
        return (
          <Badge variant="blue" size="sm">
            Gemini
          </Badge>
        );
      case 'claude':
        return (
          <Badge variant="purple" size="sm">
            Claude
          </Badge>
        );
      default:
        return (
          <Badge variant="slate" size="sm">
            {platform}
          </Badge>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
          <tr>
            <th className="p-3 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelectableChosen}
                onChange={() => (allSelectableChosen ? onDeselectAll() : onSelectAll())}
                className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-400 cursor-pointer"
                title="Select all non-protected chats"
              />
            </th>
            <th className="p-3">Title & Conversation Link</th>
            <th className="p-3 w-28">Platform</th>
            <th className="p-3 w-36">Classification</th>
            <th className="p-3">Primary Reason</th>
            <th className="p-3 w-24 text-center">Protection</th>
            <th className="p-3 w-28 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850">
          {chats.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                No conversations match the selected filter. Run a scan or adjust filters.
              </td>
            </tr>
          ) : (
            chats.map((chat) => {
              const isSelected = selectedIds.includes(chat.id);
              const isDeleted = chat.status === 'deleted';

              return (
                <tr
                  key={chat.id}
                  className={`hover:bg-slate-850/60 transition-colors ${
                    isSelected ? 'bg-slate-800/40' : ''
                  } ${chat.isProtected ? 'bg-brand-950/10' : ''} ${
                    isDeleted ? 'opacity-40 line-through' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={chat.isProtected || isDeleted}
                      onChange={() => onToggleSelect(chat.id)}
                      className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-400 disabled:opacity-30 cursor-pointer"
                    />
                  </td>

                  {/* Title & Link */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={chat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-200 hover:text-brand-400 hover:underline max-w-md truncate block"
                      >
                        {chat.title}
                      </a>
                      <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                    </div>
                    {chat.lastActivityTimestamp && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Active {new Date(chat.lastActivityTimestamp).toLocaleDateString()}
                      </span>
                    )}
                  </td>

                  {/* Platform */}
                  <td className="p-3">{getPlatformBadge(chat.platform)}</td>

                  {/* Classification */}
                  <td className="p-3">
                    {getCategoryBadge(chat.category, chat.confidence)}
                  </td>

                  {/* Reason */}
                  <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate" title={chat.reasons.join('\n')}>
                    {chat.reasons[0] || 'No low-value signals detected.'}
                  </td>

                  {/* Protection Toggle */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onToggleProtection(chat.id)}
                      title={chat.isProtected ? 'Locked: Immune from deletion' : 'Click to lock and protect'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        chat.isProtected
                          ? 'text-brand-400 bg-brand-500/10 hover:bg-brand-500/20'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {chat.isProtected ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>

                  {/* Quick Actions */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {chat.category !== 'keep' && (
                        <button
                          onClick={() => onChangeCategory(chat.id, 'keep')}
                          title="Override as Keep"
                          className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                        >
                          Keep
                        </button>
                      )}
                      {!chat.isProtected && !isDeleted && (
                        <button
                          onClick={() => onSingleDelete(chat)}
                          title="Delete single chat"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
