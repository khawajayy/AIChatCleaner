import React from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import { PlatformMark, PLATFORM_META } from '../Common/PlatformMark';
import { PlatformId } from '../../types';
import { ScanSearch, ListChecks, FlaskConical, Lock, HardDrive } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAFEGUARDS = [
  { Icon: ScanSearch, title: 'Scanning is read-only', body: 'A scan only reads conversation titles from the page. It never changes anything.' },
  { Icon: ListChecks, title: 'Every suggestion has a reason', body: 'Rules are local and explainable. You can see why each chat was flagged.' },
  { Icon: FlaskConical, title: 'Dry run by default', body: 'Batch actions are simulated until you switch dry-run off yourself.' },
  { Icon: Lock, title: 'Protection rules', body: 'Lock individual chats or protect them by keyword or pattern.' },
];

const SUPPORT: Record<PlatformId, string> = {
  chatgpt: 'Delete and archive',
  gemini: 'Delete',
  claude: 'Delete',
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to ChatSweep"
      description="Find and clear out the throwaway chats piling up in your AI assistants."
      maxWidth="2xl"
    >
      <div className="space-y-6 text-[15px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAFEGUARDS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border p-4">
              <Icon className="size-5 text-accent-text" />
              <p className="mt-2.5 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-fg-muted">{body}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 font-semibold">Supported platforms</p>
          <ul className="rounded-xl border border-border divide-y divide-border">
            {(Object.keys(PLATFORM_META) as PlatformId[]).map((p) => (
              <li key={p} className="flex items-center gap-3 px-4 py-3">
                <PlatformMark platform={p} size="sm" />
                <span className="flex-1 font-medium">{PLATFORM_META[p].name}</span>
                <span className="text-sm text-fg-muted">{SUPPORT[p]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-4">
          <HardDrive className="mt-0.5 size-5 shrink-0 text-fg-muted" />
          <p className="text-sm text-fg-muted">
            Everything stays in your browser's local extension storage. No account, no telemetry, nothing sent to a server.
          </p>
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button variant="primary" size="lg" onClick={onClose}>
            Get started
          </Button>
        </div>
      </div>
    </Modal>
  );
};
