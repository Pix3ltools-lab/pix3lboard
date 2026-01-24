// API response types for granular endpoints

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Summary types without nested children
export interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isShared?: boolean;
  boardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardSummary {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  background?: string | null;
  allowedCardTypes?: string[];
  isPublic?: boolean;
  shareRole?: 'owner' | 'viewer';
  listCount: number;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListSummary {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}
