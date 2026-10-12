import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { PlatformId, ClassificationCategory } from '../../types';

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
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversation titles..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-950/70 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
        />
      </div>

      {/* Filter Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Platform Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Platforms</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </select>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as any)}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Classifications</option>
          <option value="cleanup">Cleanup Candidates</option>
          <option value="review">Needs Review</option>
          <option value="keep">Keep</option>
        </select>

        {/* Protected Only Toggle */}
        <button
          onClick={onToggleProtectedOnly}
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
            protectedOnly
              ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          Protected Only
        </button>

        {/* Sort By */}
        <div className="flex items-center gap-1 text-xs text-slate-400 pl-2 border-l border-slate-800">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="date">Sort: Recent First</option>
            <option value="confidence">Sort: Highest Confidence</option>
            <option value="title">Sort: Title (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
