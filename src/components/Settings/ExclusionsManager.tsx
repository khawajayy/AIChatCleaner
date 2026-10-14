import React, { useState } from 'react';
import { Card, CardHeader } from '../Common/Card';
import { Button } from '../Common/Button';
import { inputClass } from '../Common/formStyles';
import { UserSettings } from '../../types';
import { Tags, Regex, Plus, X, AlertCircle } from 'lucide-react';

interface ExclusionsManagerProps {
  settings: UserSettings;
  onUpdate: (partial: Partial<UserSettings>) => void;
}

export const ExclusionsManager: React.FC<ExclusionsManagerProps> = ({ settings, onUpdate }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [patternError, setPatternError] = useState<string | null>(null);

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed || settings.protectedKeywords.includes(trimmed)) return;
    onUpdate({ protectedKeywords: [...settings.protectedKeywords, trimmed] });
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    onUpdate({ protectedKeywords: settings.protectedKeywords.filter((k) => k !== kw) });
  };

  const handleAddPattern = (e: React.FormEvent) => {
    e.preventDefault();
    setPatternError(null);
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    try {
      new RegExp(trimmed);
    } catch {
      setPatternError("That isn't a valid regular expression.");
      return;
    }
    if (settings.protectedRegexPatterns.includes(trimmed)) return;
    onUpdate({ protectedRegexPatterns: [...settings.protectedRegexPatterns, trimmed] });
    setNewPattern('');
  };

  const handleRemovePattern = (pattern: string) => {
    onUpdate({ protectedRegexPatterns: settings.protectedRegexPatterns.filter((p) => p !== pattern) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<Tags />}
          title="Protected keywords"
          description="A conversation whose title contains any of these is never suggested for cleanup."
        />
        <form onSubmit={handleAddKeyword} className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="e.g. taxes, medical, project"
            aria-label="New protected keyword"
            className={inputClass}
          />
          <Button variant="secondary" size="md" type="submit" icon={<Plus />}>
            Add
          </Button>
        </form>
        <ChipList items={settings.protectedKeywords} onRemove={handleRemoveKeyword} empty="No keywords yet." />
      </Card>

      <Card>
        <CardHeader
          icon={<Regex />}
          title="Protected patterns"
          description="Regular expressions matched against titles. Useful for tags like [work]."
        />
        <form onSubmit={handleAddPattern} className="flex gap-2">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => {
              setNewPattern(e.target.value);
              if (patternError) setPatternError(null);
            }}
            placeholder="e.g. ^\[work\].*"
            aria-label="New protected pattern"
            aria-invalid={!!patternError}
            className={`${inputClass} font-mono text-sm ${patternError ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
          />
          <Button variant="secondary" size="md" type="submit" icon={<Plus />}>
            Add
          </Button>
        </form>
        {patternError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-danger-text">
            <AlertCircle className="size-4" />
            {patternError}
          </p>
        )}
        <ChipList items={settings.protectedRegexPatterns} onRemove={handleRemovePattern} empty="No patterns yet." mono />
      </Card>
    </div>
  );
};

const ChipList: React.FC<{ items: string[]; onRemove: (item: string) => void; empty: string; mono?: boolean }> = ({
  items,
  onRemove,
  empty,
  mono,
}) => {
  if (items.length === 0) return <p className="mt-4 text-sm text-fg-subtle">{empty}</p>;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={`inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 py-1 pl-3 pr-1 text-sm ${
            mono ? 'font-mono' : ''
          }`}
        >
          <span>{item}</span>
          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item}`}
            className="flex size-6 items-center justify-center rounded-md text-fg-subtle hover:bg-danger-soft hover:text-danger-text"
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
};
