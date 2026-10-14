import React from 'react';
import { Search, Lock } from 'lucide-react';
import { PlatformId, ClassificationCategory } from '../../types';
import { inputClass, selectClass } from '../Common/formStyles';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPlatform: PlatformId | 'all';
  onPlatformChange: (p: PlatformId | 'all') => void;
  selectedCategory: ClassificationCategory | 'all';
  onCategoryChange: (c: ClassificationCategory | 'all') => void;
  sortBy: 'date' | 'title' | 'confidence';
  onSortChange: (s: 'date' | 'title' | 'confidence') => void;
  protectedOnly: boolean;
  onToggleProtectedOnly: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  protectedOnly,
  onToggleProtectedOnly,
}) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-3">
      <div className="relative flex-1 min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search titles and reasons"
          aria-label="Search conversations"
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedPlatform}
          onChange={(e) => onPlatformChange(e.target.value as PlatformId | 'all')}
          aria-label="Filter by platform"
          className={selectClass}
        >
          <option value="all">All platforms</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="gemini">Gemini</option>
          <option value="claude">Claude</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as ClassificationCategory | 'all')}
          aria-label="Filter by classification"
          className={selectClass}
        >
          <option value="all">All classifications</option>
          <option value="cleanup">Cleanup</option>
          <option value="review">Needs review</option>
          <option value="keep">Keep</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'date' | 'title' | 'confidence')}
          aria-label="Sort order"
          className={selectClass}
        >
          <option value="date">Most recent</option>
          <option value="confidence">Highest confidence</option>
          <option value="title">Title A–Z</option>
        </select>

        <button
          type="button"
          onClick={onToggleProtectedOnly}
          aria-pressed={protectedOnly}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-[15px] font-medium transition-colors ${
            protectedOnly
              ? 'border-accent bg-accent-soft text-accent-text'
              : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg'
          }`}
        >
          <Lock className="size-4" />
          Protected only
        </button>
      </div>
    </div>
  );
};
