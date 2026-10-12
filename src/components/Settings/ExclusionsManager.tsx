import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { Badge } from '../Common/Badge';
import { UserSettings } from '../../types';
import { Shield, Plus, X, AlertCircle } from 'lucide-react';

interface ExclusionsManagerProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

export const ExclusionsManager: React.FC<ExclusionsManagerProps> = ({
  settings,
  onUpdate,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [patternError, setPatternError] = useState<string | null>(null);

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed || settings.protectedKeywords.includes(trimmed)) return;

    onUpdate({
      protectedKeywords: [...settings.protectedKeywords, trimmed],
    });
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    onUpdate({
      protectedKeywords: settings.protectedKeywords.filter((k) => k !== kw),
    });
  };

  const handleAddPattern = (e: React.FormEvent) => {
    e.preventDefault();
    setPatternError(null);
    const trimmed = newPattern.trim();
    if (!trimmed) return;

    try {
      new RegExp(trimmed); // Validate syntax
    } catch {
      setPatternError('Invalid regular expression syntax.');
      return;
    }

    if (settings.protectedRegexPatterns.includes(trimmed)) return;

    onUpdate({
      protectedRegexPatterns: [...settings.protectedRegexPatterns, trimmed],
    });
    setNewPattern('');
  };

  const handleRemovePattern = (pattern: string) => {
    onUpdate({
      protectedRegexPatterns: settings.protectedRegexPatterns.filter((p) => p !== pattern),
    });
  };

  return (
    <div className="space-y-6">
      {/* Protected Keywords */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h5 className="font-semibold text-sm text-white">Protected Keyword Exclusions</h5>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Any conversation whose title contains one of these keywords is strictly protected and will never be suggested for deletion.
        </p>

        {/* Input form */}
        <form onSubmit={handleAddKeyword} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword (e.g. taxes, medical, project)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            Add Keyword
          </Button>
        </form>

        {/* Badges list */}
        <div className="mt-4 flex flex-wrap gap-2">
          {settings.protectedKeywords.map((kw) => (
            <Badge key={kw} variant="green" size="md" className="gap-1.5">
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(kw)}
                className="hover:text-rose-400 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      {/* Protected Regex Patterns */}
      <Card>
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Shield className="w-4 h-4 text-brand-400" />
          <h5 className="font-semibold text-sm text-white">Protected Regex Patterns</h5>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Advanced expression matching for conversations prefix tags or project naming conventions.
        </p>

        {/* Input form */}
        <form onSubmit={handleAddPattern} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            placeholder="Add regex (e.g. ^\[work\].*, ^client_.*)..."
            className="flex-1 px-3 py-1.5 font-mono text-xs rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Button variant="secondary" size="sm" type="submit" icon={<Plus className="w-3.5 h-3.5" />}>
            Add Pattern
          </Button>
        </form>

        {patternError && (
          <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {patternError}
          </p>
        )}

        {/* Patterns list */}
        <div className="mt-4 flex flex-wrap gap-2">
          {settings.protectedRegexPatterns.map((pat) => (
            <Badge key={pat} variant="slate" size="md" className="font-mono gap-1.5">
              <span>{pat}</span>
              <button
                type="button"
                onClick={() => handleRemovePattern(pat)}
                className="hover:text-rose-400 p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
};
