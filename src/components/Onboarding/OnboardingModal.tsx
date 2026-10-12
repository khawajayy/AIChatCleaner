import React from 'react';
import { Modal } from '../Common/Modal';
import { Button } from '../Common/Button';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome to ChatSweep"
      description="The privacy-first Chrome extension for keeping your AI chat histories tidy."
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs text-slate-300">
        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            Over weeks and months, ChatGPT, Gemini, and Claude histories accumulate disposable test prompts, accidental inputs, and abandoned questions. ChatSweep helps you discover and clean them up safely.
          </div>
        </div>

        <div>
          <h6 className="font-semibold text-white text-xs mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Our 5 Non-Negotiable Safety Safeguards:
          </h6>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-semibold text-slate-100 block">1. Scanning is 100% Read-Only</span>
              Scanning never modifies, archives, or deletes any conversation.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-semibold text-slate-100 block">2. Explainable Rule Engine</span>
              Every cleanup suggestion includes a human-readable reason. No black-box AI required.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-semibold text-slate-100 block">3. Dry-Run Mode by Default</span>
              Simulate target actions and verify conversation identities before any real change.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-semibold text-slate-100 block">4. Protected Immunity</span>
              Lock any conversation or use keyword/regex exclusions for zero accidental deletions.
            </div>
          </div>
        </div>

        <div>
          <h6 className="font-semibold text-white text-xs mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            Supported Platforms:
          </h6>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <span className="font-medium text-slate-200">ChatGPT (chatgpt.com)</span>
              <span className="text-emerald-400 font-mono">Discovered • Archive & Delete Supported</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <span className="font-medium text-slate-200">Google Gemini (gemini.google.com)</span>
              <span className="text-emerald-400 font-mono">Discovered • Delete Supported</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <span className="font-medium text-slate-200">Anthropic Claude (claude.ai)</span>
              <span className="text-emerald-400 font-mono">Discovered • Delete Supported</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Lock className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <strong>Local Privacy:</strong> All conversation titles and metrics reside in local browser storage. No accounts required, no telemetry tracking, and zero data leaves your browser.
          </span>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} icon={<CheckCircle className="w-4 h-4" />}>
            Got It, Let's Get Started
          </Button>
        </div>
      </div>
    </Modal>
  );
};
