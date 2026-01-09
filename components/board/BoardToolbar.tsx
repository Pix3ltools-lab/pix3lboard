'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Download, Upload, Filter, X } from 'lucide-react';
import { useSearch } from '@/lib/context/SearchContext';

interface BoardToolbarProps {
  availableTags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
}

export function BoardToolbar({ availableTags, onExport, onImport }: BoardToolbarProps) {
  const { query, setQuery, selectedTag, setSelectedTag, jobNumberFilter, setJobNumberFilter, clearFilters, hasActiveFilters } = useSearch();
  const [showTagFilter, setShowTagFilter] = useState(false);

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  return (
    <div className="bg-bg-secondary border-b border-bg-tertiary p-3 md:p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search cards..."
          />
        </div>

        {/* Job Number Filter */}
        <div className="sm:w-48">
          <SearchBar
            value={jobNumberFilter}
            onChange={setJobNumberFilter}
            placeholder="Job number..."
          />
        </div>

        {/* Actions row on mobile, inline on desktop */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

        {/* Tag Filter Button */}
        <div className="relative">
          <Button
            variant={selectedTag ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {selectedTag ? `Tag: ${selectedTag}` : 'Filter by Tag'}
          </Button>

          {/* Tag Filter Dropdown */}
          {showTagFilter && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTagFilter(false)}
              />
              <div className="absolute top-full mt-2 right-0 bg-bg-primary border border-bg-tertiary rounded-lg shadow-lg p-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(tag === selectedTag ? null : tag);
                        setShowTagFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-bg-secondary transition-colors text-sm ${
                        tag === selectedTag ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-primary'
                      }`}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-text-secondary">
                    No tags available
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}

        {/* Export */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

        {/* Import */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleImportClick}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
        </div>
      </div>
    </div>
  );
}
