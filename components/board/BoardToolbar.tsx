'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Download, Upload, Filter, X, Archive, Globe, Link, Check, Palette, LayoutGrid, Calendar, Users, Minimize2, Maximize2 } from 'lucide-react';
import { useSearch } from '@/lib/context/SearchContext';
import { useUI } from '@/lib/context/UIContext';

// Preset background colors for boards
const BOARD_BACKGROUNDS = [
  { name: 'Default', value: '' },
  { name: 'Ocean', value: '#0ea5e9' },
  { name: 'Forest', value: '#22c55e' },
  { name: 'Sunset', value: '#f97316' },
  { name: 'Berry', value: '#a855f7' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Midnight', value: '#1e293b' },
];

export type ViewType = 'kanban' | 'calendar';

interface BoardToolbarProps {
  availableTags: string[];
  onExport: () => void;
  onImport: (file: File) => void;
  onShowArchive: () => void;
  onShare?: () => void;
  boardId: string;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  background?: string | null;
  onBackgroundChange?: (background: string) => void;
  viewType?: ViewType;
  onViewTypeChange?: (viewType: ViewType) => void;
}

export function BoardToolbar({ availableTags, onExport, onImport, onShowArchive, onShare, boardId, isPublic, onTogglePublic, background, onBackgroundChange, viewType = 'kanban', onViewTypeChange }: BoardToolbarProps) {
  const { query, setQuery, selectedTag, setSelectedTag, jobNumberFilter, setJobNumberFilter, responsibleFilter, setResponsibleFilter, clearFilters, hasActiveFilters } = useSearch();
  const { compactMode, toggleCompactMode } = useUI();
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showPublicMenu, setShowPublicMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/${boardId}` : '';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className={`bg-bg-secondary border-b border-bg-tertiary ${compactMode ? 'p-2' : 'p-3 md:p-4'}`}>
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center ${compactMode ? 'gap-1.5' : 'gap-2 md:gap-3'}`}>
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

        {/* Responsible Filter */}
        <div className="sm:w-48">
          <SearchBar
            value={responsibleFilter}
            onChange={setResponsibleFilter}
            placeholder="Responsible..."
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

        {/* Background Color */}
        {onBackgroundChange && (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Background</span>
            </Button>

            {showBackgroundMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBackgroundMenu(false)}
                />
                <div className="absolute top-full mt-2 right-0 bg-bg-primary border border-bg-tertiary rounded-lg shadow-lg p-3 z-50">
                  <p className="text-xs text-text-secondary mb-2">Board background</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BOARD_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.name}
                        onClick={() => {
                          onBackgroundChange(bg.value);
                          setShowBackgroundMenu(false);
                        }}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          (background ?? '') === bg.value
                            ? 'border-accent-primary scale-110'
                            : 'border-transparent hover:border-bg-tertiary'
                        }`}
                        style={{ backgroundColor: bg.value || 'var(--bg-tertiary)' }}
                        title={bg.name}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Share Button */}
        {onShare && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onShare}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        {/* Public Toggle */}
        {onTogglePublic && (
          <div className="relative">
            <Button
              variant={isPublic ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowPublicMenu(!showPublicMenu)}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {isPublic ? 'Public' : 'Private'}
            </Button>

            {showPublicMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPublicMenu(false)}
                />
                <div className="absolute top-full mt-2 right-0 bg-bg-primary border border-bg-tertiary rounded-lg shadow-lg p-3 z-50 min-w-[250px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-text-primary font-medium">Public access</span>
                    <button
                      onClick={() => {
                        onTogglePublic(!isPublic);
                        if (!isPublic) setShowPublicMenu(true);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isPublic ? 'bg-accent-primary' : 'bg-bg-tertiary'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {isPublic && (
                    <>
                      <p className="text-xs text-text-secondary mb-2">
                        Anyone with the link can view this board (read-only).
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={publicUrl}
                          readOnly
                          className="flex-1 text-xs bg-bg-secondary border border-bg-tertiary rounded px-2 py-1.5 text-text-primary"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyLink}
                          className="flex items-center gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* View Toggle */}
        {onViewTypeChange && (
          <div className="flex items-center border border-bg-tertiary rounded-lg overflow-hidden">
            <button
              onClick={() => onViewTypeChange('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                viewType === 'kanban'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-primary text-text-secondary hover:text-text-primary'
              }`}
              title="Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => onViewTypeChange('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                viewType === 'calendar'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-primary text-text-secondary hover:text-text-primary'
              }`}
              title="Calendar view"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        )}

        {/* Compact Mode Toggle */}
        <Button
          variant={compactMode ? 'primary' : 'secondary'}
          size="sm"
          onClick={toggleCompactMode}
          className="flex items-center gap-2"
          title={compactMode ? 'Switch to normal view' : 'Switch to compact view'}
        >
          {compactMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{compactMode ? 'Normal' : 'Compact'}</span>
        </Button>

        {/* Archive */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onShowArchive}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          Archive
        </Button>

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
