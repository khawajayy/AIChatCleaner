import React from 'react';
import { ChatMetadata, ClassificationCategory } from '../../types';
import { Badge } from '../Common/Badge';
import { PlatformMark, PLATFORM_META } from '../Common/PlatformMark';
import { displayReason } from '../Common/reasons';
import { ExternalLink, Trash2, Lock, Unlock, Inbox } from 'lucide-react';

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

const CATEGORY_BADGE: Record<ClassificationCategory, { label: string; variant: 'rose' | 'amber' | 'green' }> = {
  cleanup: { label: 'Cleanup', variant: 'rose' },
  review: { label: 'Review', variant: 'amber' },
  keep: { label: 'Keep', variant: 'green' },
};

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
  const selectableChats = chats.filter((c) => !c.isProtected && c.status !== 'deleted');
  const allSelectableChosen =
    selectableChats.length > 0 && selectableChats.every((c) => selectedIds.includes(c.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[15px]">
          <thead className="border-b border-border bg-surface-2 text-sm text-fg-muted">
            <tr>
              <th scope="col" className="w-12 py-3 pl-5 pr-2">
                <input
                  type="checkbox"
                  checked={allSelectableChosen}
                  onChange={() => (allSelectableChosen ? onDeselectAll() : onSelectAll())}
                  aria-label="Select all unprotected conversations"
                />
              </th>
              <th scope="col" className="py-3 px-3 font-medium">Conversation</th>
              <th scope="col" className="py-3 px-3 font-medium w-32">Platform</th>
              <th scope="col" className="py-3 px-3 font-medium w-40">Classification</th>
              <th scope="col" className="py-3 px-3 font-medium">Reason</th>
              <th scope="col" className="py-3 pl-3 pr-5 font-medium w-36 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {chats.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Inbox className="mx-auto size-8 text-fg-subtle" />
                  <p className="mt-3 text-base font-medium">No conversations match</p>
                  <p className="mt-1 text-sm text-fg-muted">Run a scan or loosen the filters above.</p>
                </td>
              </tr>
            ) : (
              chats.map((chat) => {
                const isSelected = selectedIds.includes(chat.id);
                const isDeleted = chat.status === 'deleted';
                const badge = CATEGORY_BADGE[chat.category] ?? CATEGORY_BADGE.keep;

                return (
                  <tr
                    key={chat.id}
                    className={`transition-colors ${isSelected ? 'bg-accent-soft/60' : 'hover:bg-surface-2/70'} ${
                      isDeleted ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3.5 pl-5 pr-2 align-top">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={isSelected}
                        disabled={chat.isProtected || isDeleted}
                        onChange={() => onToggleSelect(chat.id)}
                        aria-label={`Select ${chat.title}`}
                      />
                    </td>

                    <td className="py-3.5 px-3 align-top max-w-0 w-[32%]">
                      <a
                        href={chat.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`group inline-flex max-w-full items-center gap-1.5 font-medium hover:text-accent-text ${
                          isDeleted ? 'line-through' : ''
                        }`}
                        title={chat.title}
                      >
                        <span className="truncate">{chat.title}</span>
                        <ExternalLink className="size-3.5 shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100" />
                      </a>
                      <div className="mt-0.5 flex items-center gap-2 text-sm text-fg-subtle">
                        {chat.isProtected && (
                          <span className="inline-flex items-center gap-1 text-accent-text">
                            <Lock className="size-3.5" />
                            Protected
                          </span>
                        )}
                        {isDeleted && <span>Deleted</span>}
                        {chat.lastActivityTimestamp && (
                          <span>Active {new Date(chat.lastActivityTimestamp).toLocaleDateString()}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <span className="inline-flex items-center gap-2 text-sm">
                        <PlatformMark platform={chat.platform} size="sm" />
                        {PLATFORM_META[chat.platform]?.shortName ?? chat.platform}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                        <span className="opacity-70 tabular-nums">{Math.round(chat.confidence * 100)}%</span>
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 align-top max-w-0 text-sm text-fg-muted">
                      <p className="line-clamp-2" title={chat.reasons.map(displayReason).join('\n')}>
                        {chat.reasons[0] ? displayReason(chat.reasons[0]) : 'No low-value signals found.'}
                      </p>
                    </td>

                    <td className="py-3.5 pl-3 pr-5 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {chat.category !== 'keep' && !isDeleted && (
                          <button
                            type="button"
                            onClick={() => onChangeCategory(chat.id, 'keep')}
                            className="h-8 rounded-md px-2.5 text-sm font-medium text-fg-muted hover:bg-surface-3 hover:text-fg"
                          >
                            Keep
                          </button>
                        )}
                        <IconAction
                          label={chat.isProtected ? 'Remove protection' : 'Protect conversation'}
                          onClick={() => onToggleProtection(chat.id)}
                          active={chat.isProtected}
                        >
                          {chat.isProtected ? <Lock /> : <Unlock />}
                        </IconAction>
                        {!chat.isProtected && !isDeleted && (
                          <IconAction label="Delete conversation" onClick={() => onSingleDelete(chat)} danger>
                            <Trash2 />
                          </IconAction>
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
    </div>
  );
};

const IconAction: React.FC<{
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, active, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4 ${
      active
        ? 'bg-accent-soft text-accent-text'
        : danger
        ? 'text-fg-subtle hover:bg-danger-soft hover:text-danger-text'
        : 'text-fg-subtle hover:bg-surface-3 hover:text-fg'
    }`}
  >
    {children}
  </button>
);
