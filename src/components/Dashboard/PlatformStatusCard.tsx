import React from 'react';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { Button } from '../Common/Button';
import { PlatformId } from '../../types';
import { CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { AdapterRegistry } from '../../adapters/registry';

interface PlatformStatusCardProps {
  platform: PlatformId;
  name: string;
  url: string;
  connected: boolean;
  totalDiscovered: number;
  lastScanTimestamp: number | null;
  onScan: (platform: PlatformId) => void;
  isScanning: boolean;
}

export const PlatformStatusCard: React.FC<PlatformStatusCardProps> = ({
  platform,
  name,
  url,
  connected,
  totalDiscovered,
  lastScanTimestamp,
  onScan,
  isScanning,
}) => {
  const adapter = AdapterRegistry.getAdapter(platform);
  const caps = adapter?.capabilities;

  const formatLastScan = (ts: number | null) => {
    if (!ts) return 'Never scanned';
    const diffMin = Math.floor((Date.now() - ts) / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
              {name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h5 className="font-semibold text-sm text-white">{name}</h5>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-300"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{url.replace('https://', '')}</p>
            </div>
          </div>

          {connected ? (
            <Badge variant="green" size="sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Connected
            </Badge>
          ) : (
            <Badge variant="slate" size="sm">
              <AlertCircle className="w-3 h-3 text-slate-400" />
              Tab Standby
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4 py-3 border-y border-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-400">Discovered</span>
            <p className="text-lg font-bold text-white font-mono">{totalDiscovered}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Last Scanned</span>
            <p className="text-xs text-slate-300 mt-1 font-medium">{formatLastScan(lastScanTimestamp)}</p>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Archive Support:</span>
            <span className={caps?.supportsArchive ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
              {caps?.supportsArchive ? 'Supported' : 'Not Available in Web UI'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Delete Support:</span>
            <span className={caps?.supportsDelete ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
              Supported
            </span>
          </div>
        </div>

        {/* Honest Limitations note */}
        {caps?.limitations && caps.limitations.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-medium">Platform Note: </span>
            {caps.limitations[0]}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onScan(platform)}
          isLoading={isScanning}
          icon={<RefreshCw className="w-3 h-3" />}
        >
          Scan {name}
        </Button>
      </div>
    </Card>
  );
};
