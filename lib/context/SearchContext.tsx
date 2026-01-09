'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Card } from '@/types';

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  jobNumberFilter: string;
  setJobNumberFilter: (jobNumber: string) => void;
  filterCards: (cards: Card[]) => Card[];
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [jobNumberFilter, setJobNumberFilter] = useState('');

  /**
   * Filter cards based on search query, selected tag, and job number
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

        // Filter by job number (partial match, case-insensitive)
        const matchesJobNumber = jobNumberFilter
          ? card.jobNumber?.toLowerCase().includes(jobNumberFilter.toLowerCase()) ?? false
          : true;

        return matchesQuery && matchesTag && matchesJobNumber;
      });
    },
    [query, selectedTag, jobNumberFilter]
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    setSelectedTag(null);
    setJobNumberFilter('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return query.length > 0 || selectedTag !== null || jobNumberFilter.length > 0;
  }, [query, selectedTag, jobNumberFilter]);

  const value: SearchContextType = {
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    jobNumberFilter,
    setJobNumberFilter,
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
