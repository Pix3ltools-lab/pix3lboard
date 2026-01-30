'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { MAX_TAGS_PER_CARD } from '@/lib/constants';

interface TagInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagInput({ value = [], onChange, disabled = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (value.length >= MAX_TAGS_PER_CARD) return;
    if (value.includes(trimmed)) return;

    onChange([...value, trimmed]);
    setInputValue('');
  };

  const handleRemoveTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Tags (max {MAX_TAGS_PER_CARD})
      </label>

      {/* Existing tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-sm"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-accent-primary/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input for new tag */}
      {!disabled && value.length < MAX_TAGS_PER_CARD && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 bg-bg-primary border border-bg-tertiary rounded text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent-primary"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!inputValue.trim() || value.length >= MAX_TAGS_PER_CARD}
            className="px-3 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
