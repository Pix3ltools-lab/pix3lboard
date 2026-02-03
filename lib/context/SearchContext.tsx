'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { Card } from '@/types';

export interface SearchResult {
  card_id: string;
  title: string;
  description: string | null;
  list_id: string;
  list_name: string;
  match_type: 'title' | 'description' | 'comment';
  snippet: string;
}

// Quick filter types
export type QuickFilterType = 'myCards' | 'dueSoon' | 'overdue' | 'noResponsible' | 'highPriority';

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  jobNumberFilter: string;
  setJobNumberFilter: (jobNumber: string) => void;
  responsibleFilter: string;
  setResponsibleFilter: (responsible: string) => void;
  // Quick filters
  quickFilters: Set<QuickFilterType>;
  toggleQuickFilter: (filter: QuickFilterType) => void;
  clearQuickFilters: () => void;
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  // Filter function
  filterCards: (cards: Card[]) => Card[];
  clearFilters: () => void;
  hasActiveFilters: boolean;
  // Server search for comments
  boardId: string | null;
  setBoardId: (boardId: string | null) => void;
  serverSearchResults: SearchResult[];
  isSearching: boolean;
  commentMatchCardIds: Set<string>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilterType>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [serverSearchResults, setServerSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const toggleQuickFilter = useCallback((filter: QuickFilterType) => {
    setQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }, []);

  const clearQuickFilters = useCallback(() => {
    setQuickFilters(new Set());
  }, []);

  // Server-side search for comments (with debounce)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only search server-side if we have a boardId and query is long enough
    if (!boardId || query.length < 2) {
      setServerSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/boards/${boardId}/search?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setServerSearchResults(data.results || []);
        } else {
          setServerSearchResults([]);
        }
      } catch {
        setServerSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, boardId]);

  // Card IDs that match in comments (but might not match in title/description)
  const commentMatchCardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const result of serverSearchResults) {
      if (result.match_type === 'comment') {
        ids.add(result.card_id);
      }
    }
    return ids;
  }, [serverSearchResults]);

  /**
   * Filter cards based on search query, selected tag, job number, and quick filters
   * Searches in title, description, and comments (via server search)
   */
  const filterCards = useCallback(
    (cards: Card[]): Card[] => {
      // Get today's date for due date comparisons
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      return cards.filter((card) => {
        // Filter by search query (title + description + comments)
        const lowerQuery = query.toLowerCase();
        const matchesInTitleOrDesc = query
          ? card.title.toLowerCase().includes(lowerQuery) ||
            card.description?.toLowerCase().includes(lowerQuery)
          : true;

        // Also include cards that match in comments (from server search)
        const matchesInComments = query && commentMatchCardIds.has(card.id);

        const matchesQuery = query ? (matchesInTitleOrDesc || matchesInComments) : true;

        // Filter by tag (exact match, single tag only in MVP)
        const matchesTag = selectedTag
          ? card.tags?.includes(selectedTag) ?? false
          : true;

        // Filter by job number (partial match, case-insensitive)
        const matchesJobNumber = jobNumberFilter
          ? card.jobNumber?.toLowerCase().includes(jobNumberFilter.toLowerCase()) ?? false
          : true;

        // Filter by responsible (partial match, case-insensitive)
        // Search in both legacy text field and linked user name/email
        const matchesResponsible = responsibleFilter
          ? (card.responsible?.toLowerCase().includes(responsibleFilter.toLowerCase()) ||
             card.responsibleUserName?.toLowerCase().includes(responsibleFilter.toLowerCase()) ||
             card.responsibleUserEmail?.toLowerCase().includes(responsibleFilter.toLowerCase())) ?? false
          : true;

        // Quick filters (if any active, card must match at least one)
        let matchesQuickFilters = true;
        if (quickFilters.size > 0) {
          const cardDueDate = card.dueDate?.split('T')[0];

          const checks: boolean[] = [];

          if (quickFilters.has('myCards')) {
            checks.push(card.responsibleUserId === currentUserId);
          }
          if (quickFilters.has('dueSoon')) {
            checks.push(cardDueDate === todayStr || cardDueDate === tomorrowStr);
          }
          if (quickFilters.has('overdue')) {
            checks.push(!!cardDueDate && cardDueDate < todayStr);
          }
          if (quickFilters.has('noResponsible')) {
            checks.push(!card.responsibleUserId && !card.responsible);
          }
          if (quickFilters.has('highPriority')) {
            checks.push(card.priority === 'high');
          }

          // Card must match ALL selected quick filters (AND logic)
          matchesQuickFilters = checks.length === 0 || checks.every(Boolean);
        }

        return matchesQuery && matchesTag && matchesJobNumber && matchesResponsible && matchesQuickFilters;
      });
    },
    [query, selectedTag, jobNumberFilter, responsibleFilter, commentMatchCardIds, quickFilters, currentUserId]
  );

  const clearFilters = useCallback(() => {
    setQuery('');
    setSelectedTag(null);
    setJobNumberFilter('');
    setResponsibleFilter('');
    setQuickFilters(new Set());
    setServerSearchResults([]);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return query.length > 0 || selectedTag !== null || jobNumberFilter.length > 0 || responsibleFilter.length > 0 || quickFilters.size > 0;
  }, [query, selectedTag, jobNumberFilter, responsibleFilter, quickFilters]);

  const value: SearchContextType = {
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    jobNumberFilter,
    setJobNumberFilter,
    responsibleFilter,
    setResponsibleFilter,
    quickFilters,
    toggleQuickFilter,
    clearQuickFilters,
    currentUserId,
    setCurrentUserId,
    filterCards,
    clearFilters,
    hasActiveFilters,
    boardId,
    setBoardId,
    serverSearchResults,
    isSearching,
    commentMatchCardIds,
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
