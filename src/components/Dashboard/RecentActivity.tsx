import React from 'react';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { OperationLog } from '../../types';
import { Check, X, Shield, Clock } from 'lucide-react';

interface RecentActivityProps {
  logs: OperationLog[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ logs }) => {
  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h5 className="font-semibold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Audit & Operation Trail
          </h5>
          <p className="text-xs text-slate-400 mt-0.5">
            Local verification records of dry-run and executed cleanup operations
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {logs.length} logged events
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          No cleanup operations executed yet. Run a scan and review flagged conversations to begin.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 mt-2 max-h-60 overflow-y-auto">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {log.action === 'dry_run' ? (
                  <Badge variant="green" size="sm">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Dry-Run
                  </Badge>
                ) : log.success ? (
                  <Badge variant="blue" size="sm">
                    <Check className="w-3 h-3 text-blue-400" />
                    {log.action === 'delete' ? 'Deleted' : 'Archived'}
                  </Badge>
                ) : (
                  <Badge variant="rose" size="sm">
                    <X className="w-3 h-3 text-rose-400" />
                    Failed
                  </Badge>
                )}

                <div className="flex flex-col">
                  <span className="text-slate-200 font-medium max-w-sm truncate">
                    {log.chatTitle || `Chat ID: ${log.chatId}`}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {log.platform} {log.verified ? '• DOM Verified' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                {log.error && (
                  <span className="text-rose-400 max-w-xs truncate text-[10px]">
                    {log.error}
                  </span>
                )}
                <span>{formatTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
