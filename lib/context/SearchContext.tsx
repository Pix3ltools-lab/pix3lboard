'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Card } from '@/types';

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  filterCards: (cards: Card[]) => Card[];
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  /**
   * Filter cards based on search query and selected tag
   * MVP: Search only in title (not description/prompt)
   */
  const filterCards = useCallback(
    (cards: Card[]): Card[] => {
      return cards.filter((card) => {
        // Filter by search query (title only, case-insensitive)
        const matchesQuery = query
          ? card.title.toLowerCase().includes(query.toLowerCase())
          : true;

        // Filter by tag (exact match, single tag only in MVP)
        const matchesTag = selectedTag
          ? card.tags?.includes(selectedTag) ?? false
          : true;

        return matchesQuery && matchesTag;
      });
    },
    [query, selectedTag]
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    setSelectedTag(null);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return query.length > 0 || selectedTag !== null;
  }, [query, selectedTag]);

  const value: SearchContextType = {
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    filterCards,
    clearFilters,
    hasActiveFilters,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
