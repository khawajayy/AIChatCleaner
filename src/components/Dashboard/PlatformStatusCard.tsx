import React from 'react';
import { Card } from '../Common/Card';
import { Badge } from '../Common/Badge';
import { Button } from '../Common/Button';
import { PlatformMark } from '../Common/PlatformMark';
import { PlatformId } from '../../types';
import { Check, Minus, ExternalLink, RefreshCw } from 'lucide-react';
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

function formatLastScan(ts: number | null) {
  if (!ts) return 'Never';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  return `${Math.floor(diffHours / 24)} d ago`;
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
  const caps = AdapterRegistry.getAdapter(platform)?.capabilities;

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PlatformMark platform={platform} size="lg" />
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">{name}</h3>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent-text"
            >
              {url.replace('https://', '')}
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
        {connected ? <Badge variant="green" size="sm">Scanned</Badge> : <Badge variant="slate" size="sm">Not scanned</Badge>}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-surface-2 px-4 py-3">
        <div>
          <dt className="text-sm text-fg-muted">Found</dt>
          <dd className="text-2xl font-semibold tabular-nums">{totalDiscovered}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">Last scan</dt>
          <dd className="mt-1.5 text-[15px] font-medium">{formatLastScan(lastScanTimestamp)}</dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-2 text-sm">
        <Capability label="Delete" supported={!!caps?.supportsDelete} />
        <Capability label="Archive" supported={!!caps?.supportsArchive} />
      </ul>

      {caps?.limitations?.[0] && <p className="mt-4 text-sm text-fg-subtle leading-relaxed">{caps.limitations[0]}</p>}

      <div className="mt-auto pt-5">
        <Button variant="secondary" size="md" fullWidth onClick={() => onScan(platform)} disabled={isScanning} icon={<RefreshCw />}>
          Scan {name.split(' ').pop()}
        </Button>
      </div>
    </Card>
  );
};

const Capability: React.FC<{ label: string; supported: boolean }> = ({ label, supported }) => (
  <li className="flex items-center justify-between">
    <span className="text-fg-muted">{label}</span>
    <span className={`inline-flex items-center gap-1.5 font-medium ${supported ? 'text-accent-text' : 'text-fg-subtle'}`}>
      {supported ? <Check className="size-4" /> : <Minus className="size-4" />}
      {supported ? 'Supported' : 'Not available'}
    </span>
  </li>
);
