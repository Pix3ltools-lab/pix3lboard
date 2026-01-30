'use client';

import { useState } from 'react';
import { X, Plus, ExternalLink } from 'lucide-react';
import { MAX_LINKS_PER_CARD } from '@/lib/constants';

interface LinkInputProps {
  value?: string[];
  onChange: (links: string[]) => void;
  disabled?: boolean;
}

export function LinkInput({ value = [], onChange, disabled = false }: LinkInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddLink = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (value.length >= MAX_LINKS_PER_CARD) {
      setError(`Maximum ${MAX_LINKS_PER_CARD} links allowed`);
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL');
      return;
    }
    if (value.includes(trimmed)) {
      setError('Link already added');
      return;
    }

    onChange([...value, trimmed]);
    setInputValue('');
    setError('');
  };

  const handleRemoveLink = (link: string) => {
    onChange(value.filter((l) => l !== link));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLink();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Links (max {MAX_LINKS_PER_CARD})
      </label>

      {/* Existing links */}
      {value.length > 0 && (
        <div className="space-y-2 mb-2">
          {value.map((link) => (
            <div
              key={link}
              className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded group"
            >
              <ExternalLink className="h-4 w-4 text-text-secondary flex-shrink-0" />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-accent-primary hover:underline truncate"
              >
                {link}
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link)}
                  className="flex-shrink-0 p-1 hover:bg-bg-tertiary rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-text-secondary" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input for new link */}
      {!disabled && value.length < MAX_LINKS_PER_CARD && (
        <div>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 bg-bg-primary border border-bg-tertiary rounded text-sm text-text-primary placeholder-text-secondary outline-none focus:border-accent-primary"
            />
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!inputValue.trim() || value.length >= MAX_LINKS_PER_CARD}
              className="px-3 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-xs text-accent-danger mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
