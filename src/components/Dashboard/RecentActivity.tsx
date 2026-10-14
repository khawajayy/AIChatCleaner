import React from 'react';
import { Card, CardHeader } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { PLATFORM_META } from '../Common/PlatformMark';
import { OperationLog } from '../../types';
import { Check, X, Shield, Clock } from 'lucide-react';

interface RecentActivityProps {
  logs: OperationLog[];
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ logs }) => {
  return (
    <Card>
      <CardHeader
        icon={<Clock />}
        title="Activity log"
        description="Dry runs and real actions, recorded locally."
        action={<span className="text-sm text-fg-subtle tabular-nums">{logs.length} events</span>}
      />

      {logs.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-fg-muted">
          Nothing yet. Scan a platform and review what it finds to get started.
        </p>
      ) : (
        <ul className="-mx-6 -mb-6 divide-y divide-border max-h-96 overflow-y-auto">
          {logs.slice(0, 20).map((log) => (
            <li key={log.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="w-24 shrink-0">
                {log.action === 'dry_run' ? (
                  <Badge variant="slate" size="sm">
                    <Shield />
                    Dry run
                  </Badge>
                ) : log.success ? (
                  <Badge variant="green" size="sm">
                    <Check />
                    {log.action === 'delete' ? 'Deleted' : 'Archived'}
                  </Badge>
                ) : (
                  <Badge variant="rose" size="sm">
                    <X />
                    Failed
                  </Badge>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{log.chatTitle || `Chat ${log.chatId}`}</p>
                <p className="truncate text-sm text-fg-subtle">
                  {PLATFORM_META[log.platform]?.shortName ?? log.platform}
                  {log.verified && ' · verified'}
                  {log.error && <span className="text-danger-text"> · {log.error}</span>}
                </p>
              </div>

              <span className="shrink-0 text-sm text-fg-subtle tabular-nums">{formatTime(log.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
