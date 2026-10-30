import React from 'react';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { Button } from '../Common/Button';
import { PlatformMark, PLATFORM_META } from '../Common/PlatformMark';
import { displayReason } from '../Common/reasons';
import { ChatMetadata } from '../../types';
import { ExternalLink, Check, Trash2, Lock, Unlock } from 'lucide-react';

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
  onMarkCleanup,
  onToggleProtect,
  onDeleteSingle,
}) => {
  const isCleanup = chat.category === 'cleanup';

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start gap-3">
        <PlatformMark platform={chat.platform} />
        <div className="min-w-0 flex-1">
          <a
            href={chat.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex max-w-full items-center gap-1.5 text-base font-semibold hover:text-accent-text"
            title={chat.title}
          >
            <span className="truncate">{chat.title}</span>
            <ExternalLink className="size-4 shrink-0 text-fg-subtle group-hover:text-accent-text" />
          </a>
          <p className="text-sm text-fg-subtle">
            {PLATFORM_META[chat.platform]?.shortName ?? chat.platform} · {Math.round(chat.confidence * 100)}% confidence
          </p>
        </div>
        <Badge variant={isCleanup ? 'rose' : 'amber'} size="sm">
          {isCleanup ? 'Cleanup' : 'Review'}
        </Badge>
      </div>

      <div className="mt-4 rounded-lg bg-surface-2 px-4 py-3">
        <p className="text-sm font-medium text-fg-muted">Why it was flagged</p>
        <ul className="mt-1.5 space-y-1 text-[15px]">
          {chat.reasons.map((reason, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
              <span>{displayReason(reason)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleProtect(chat.id)}
          icon={chat.isProtected ? <Lock /> : <Unlock />}
          className={chat.isProtected ? 'text-accent-text' : ''}
        >
          {chat.isProtected ? 'Protected' : 'Protect'}
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onKeep(chat.id)} icon={<Check />}>
            Keep
          </Button>
          {isCleanup ? (
            <Button variant="danger" size="sm" onClick={() => onDeleteSingle(chat)} icon={<Trash2 />} disabled={chat.isProtected}>
              Delete
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => onMarkCleanup(chat.id)} icon={<Trash2 />}>
              Mark for cleanup
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
