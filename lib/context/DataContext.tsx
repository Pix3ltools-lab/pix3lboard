'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { Workspace, Board, List, Card, AppData, StorageInfo, SyncChange, SyncConflict } from '@/types';
import { exportData as exportDataUtil } from '@/lib/storage/export';
import { importData as importDataUtil } from '@/lib/storage/import';
import { useAuth } from '@/lib/context/AuthContext';
import {
  createAIMusicVideoBoard,
  createProjectManagementBoard,
  createSoftwareDevelopmentBoard
} from '@/lib/storage/template';
import { TemplateType } from '@/components/board/BoardForm';
import { generateId } from '@/lib/utils/id';
import { throttle } from '@/lib/utils/debounce';
import { calculateCardPosition, calculateListPosition } from '@/lib/utils/position';
import { ConflictModal } from '@/components/ui/ConflictModal';

// ===== INDEXED STATE STRUCTURE =====
interface IndexedState {
  // Primary indices - O(1) lookup
  workspacesById: Map<string, Workspace>;
  boardsById: Map<string, Board>;
  listsById: Map<string, List>;
  cardsById: Map<string, Card>;

  // Relational indices
  boardsByWorkspaceId: Map<string, Set<string>>;
  listsByBoardId: Map<string, Set<string>>;
  cardsByListId: Map<string, Set<string>>;

  // Order indices
  listOrderByBoardId: Map<string, string[]>;
  cardOrderByListId: Map<string, string[]>;
}

function createEmptyIndexedState(): IndexedState {
  return {
    workspacesById: new Map(),
    boardsById: new Map(),
    listsById: new Map(),
    cardsById: new Map(),
    boardsByWorkspaceId: new Map(),
    listsByBoardId: new Map(),
    cardsByListId: new Map(),
    listOrderByBoardId: new Map(),
    cardOrderByListId: new Map(),
  };
}

// Normalize nested structure to indexed state
function normalizeToIndexedState(workspaces: Workspace[]): IndexedState {
  const state = createEmptyIndexedState();

  for (const ws of workspaces) {
    // Store workspace (without boards array for indexing)
    state.workspacesById.set(ws.id, ws);
    state.boardsByWorkspaceId.set(ws.id, new Set());

    for (const board of ws.boards) {
      state.boardsById.set(board.id, board);
      state.boardsByWorkspaceId.get(ws.id)!.add(board.id);
      state.listsByBoardId.set(board.id, new Set());
      state.listOrderByBoardId.set(board.id, []);

      // Sort lists by position
      const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);

      for (const list of sortedLists) {
        state.listsById.set(list.id, list);
        state.listsByBoardId.get(board.id)!.add(list.id);
        state.listOrderByBoardId.get(board.id)!.push(list.id);
        state.cardsByListId.set(list.id, new Set());
        state.cardOrderByListId.set(list.id, []);

        // Sort cards by position
        const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);

        for (const card of sortedCards) {
          state.cardsById.set(card.id, card);
          state.cardsByListId.get(list.id)!.add(card.id);
          state.cardOrderByListId.get(list.id)!.push(card.id);
        }
      }
    }
  }

  return state;
}

// Denormalize indexed state back to nested structure (for backward compatibility)
function denormalizeToTree(state: IndexedState): Workspace[] {
  const workspaces: Workspace[] = [];

  for (const ws of state.workspacesById.values()) {
    const boardIds = state.boardsByWorkspaceId.get(ws.id) || new Set();
    const boards: Board[] = [];

    for (const boardId of boardIds) {
      const board = state.boardsById.get(boardId);
      if (!board) continue;

      const listOrder = state.listOrderByBoardId.get(boardId) || [];
      const lists: List[] = [];

      for (const listId of listOrder) {
        const list = state.listsById.get(listId);
        if (!list) continue;

        const cardOrder = state.cardOrderByListId.get(listId) || [];
        const cards: Card[] = [];

        for (const cardId of cardOrder) {
          const card = state.cardsById.get(cardId);
          if (card) cards.push(card);
        }

        lists.push({ ...list, cards });
      }

      boards.push({ ...board, lists });
    }

    workspaces.push({ ...ws, boards });
  }

  return workspaces;
}

interface DataContextType {
  // State
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeBoardId: string | null;
  isInitialized: boolean;

  // Workspace operations
  createWorkspace: (data: Partial<Workspace>) => Workspace;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  getWorkspace: (id: string) => Workspace | undefined;

  // Board operations
  createBoard: (workspaceId: string, data: Partial<Board>, templateType?: TemplateType) => Board;
  updateBoard: (id: string, data: Partial<Board>) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (id: string) => Board | null;
  moveBoard: (boardId: string, targetWorkspaceId: string) => void;
  getBoard: (id: string) => Board | undefined;

  // List operations
  createList: (boardId: string, data: Partial<List>) => List;
  updateList: (id: string, data: Partial<List>) => void;
  deleteList: (id: string) => void;
  reorderLists: (boardId: string, listIds: string[]) => void;
  getList: (id: string) => List | undefined;

  // Card operations
  createCard: (listId: string, data: Partial<Card>) => Card;
  updateCard: (id: string, data: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, targetListId: string, targetIndex: number) => void;
  duplicateCard: (id: string) => Card | null;
  getCard: (id: string) => Card | undefined;

  // Storage operations
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  clearAllData: () => void;
  getStorageSize: () => StorageInfo;

  // Navigation
  setActiveWorkspace: (id: string | null) => void;
  setActiveBoard: (id: string | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [indexedState, setIndexedState] = useState<IndexedState>(createEmptyIndexedState);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canSave, setCanSave] = useState(false);

  // Change tracking for delta sync
  const [pendingChanges, setPendingChanges] = useState<SyncChange[]>([]);
  const syncInProgressRef = useRef(false);
  const clientVersionRef = useRef(Date.now());

  // Conflict resolution
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const conflictQueueRef = useRef<SyncConflict[]>([]);

  // Track change helper - includes expectedUpdatedAt for conflict detection on updates
  const trackChange = useCallback((change: Omit<SyncChange, 'timestamp'>, expectedUpdatedAt?: string) => {
    const syncChange: SyncChange = {
      ...change,
      timestamp: Date.now(),
    };

    // Add expectedUpdatedAt for update operations (for conflict detection)
    if (change.operation === 'update' && expectedUpdatedAt) {
      syncChange.expectedUpdatedAt = expectedUpdatedAt;
    }

    setPendingChanges(prev => [...prev, syncChange]);
  }, []);

  // Derive workspaces array from indexed state (backward compatibility)
  const workspaces = useMemo(() => denormalizeToTree(indexedState), [indexedState]);

  // Load data from Turso on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIndexedState(createEmptyIndexedState());
      setIsInitialized(true);
      setCanSave(false);
      setPendingChanges([]);
      return;
    }

    async function loadData() {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        const normalized = normalizeToIndexedState(data.workspaces || []);
        setIndexedState(normalized);
        setCanSave(true);
        clientVersionRef.current = Date.now();
      } catch (error) {
        console.error('Failed to load data:', error);
        setIndexedState(createEmptyIndexedState());
        setCanSave(false);
      } finally {
        setIsInitialized(true);
      }
    }

    loadData();
  }, [isAuthenticated]);

  // Show next conflict from queue
  const showNextConflict = useCallback(() => {
    if (conflictQueueRef.current.length > 0) {
      setCurrentConflict(conflictQueueRef.current.shift() || null);
    } else {
      setCurrentConflict(null);
    }
  }, []);

  // Handle conflict resolution - overwrite server with local changes
  const handleConflictOverwrite = useCallback(() => {
    if (!currentConflict) return;

    // Re-add the change without expectedUpdatedAt to force overwrite
    const change = currentConflict.pendingChange;
    setPendingChanges(prev => [...prev, {
      ...change,
      timestamp: Date.now(),
      expectedUpdatedAt: undefined, // Remove to bypass conflict check
    }]);

    showNextConflict();
  }, [currentConflict, showNextConflict]);

  // Handle conflict resolution - discard local changes
  const handleConflictDiscard = useCallback(() => {
    // Just close the modal - the change was already skipped server-side
    showNextConflict();
  }, [showNextConflict]);

  // Throttled sync with delta changes
  const syncChanges = useMemo(
    () =>
      throttle(async (changes: SyncChange[]) => {
        if (!isAuthenticated || changes.length === 0 || syncInProgressRef.current) return;

        syncInProgressRef.current = true;
        try {
          const response = await fetch('/api/sync', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              changes,
              clientVersion: clientVersionRef.current,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            clientVersionRef.current = result.serverVersion || Date.now();

            // Handle conflicts
            if (result.conflicts && result.conflicts.length > 0) {
              conflictQueueRef.current = [...conflictQueueRef.current, ...result.conflicts];
              if (!currentConflict) {
                setCurrentConflict(conflictQueueRef.current.shift() || null);
              }
            }

            // Clear successfully synced changes (not the conflicted ones)
            const conflictedTimestamps = new Set(
              (result.conflicts || []).map((c: SyncConflict) => c.pendingChange.timestamp)
            );
            setPendingChanges(prev =>
              prev.filter(c =>
                !changes.some(sc => sc.timestamp === c.timestamp) ||
                conflictedTimestamps.has(c.timestamp)
              )
            );
          } else {
            console.error('Sync failed, will retry with full save');
            // Fallback to full save
            await fallbackFullSave();
          }
        } catch (error) {
          console.error('Sync error:', error);
          await fallbackFullSave();
        } finally {
          syncInProgressRef.current = false;
        }
      }, 2000),
    [isAuthenticated, currentConflict]
  );

  // Fallback to full save if sync fails
  const fallbackFullSave = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces: denormalizeToTree(indexedState) }),
      });
      if (response.ok) {
        setPendingChanges([]);
      }
    } catch (error) {
      console.error('Full save error:', error);
    }
  }, [isAuthenticated, indexedState]);

  // Auto-sync on pending changes
  useEffect(() => {
    if (isInitialized && canSave && isAuthenticated && pendingChanges.length > 0) {
      syncChanges(pendingChanges);
    }
  }, [pendingChanges, isInitialized, canSave, isAuthenticated, syncChanges]);

  // ===== WORKSPACE OPERATIONS =====

  const createWorkspace = useCallback((data: Partial<Workspace>): Workspace => {
    const now = new Date().toISOString();
    const newWorkspace: Workspace = {
      id: generateId(),
      name: data.name || 'Untitled Workspace',
      description: data.description,
      icon: data.icon || '💼',
      color: data.color || '#8b5cf6',
      createdAt: now,
      updatedAt: now,
      boards: [],
    };

    setIndexedState(prev => {
      const next = { ...prev };
      next.workspacesById = new Map(prev.workspacesById);
      next.workspacesById.set(newWorkspace.id, newWorkspace);
      next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
      next.boardsByWorkspaceId.set(newWorkspace.id, new Set());
      return next;
    });

    trackChange({
      entityType: 'workspace',
      entityId: newWorkspace.id,
      operation: 'create',
      data: newWorkspace,
    });

    return newWorkspace;
  }, [trackChange]);

  const updateWorkspace = useCallback((id: string, data: Partial<Workspace>) => {
    const existing = indexedState.workspacesById.get(id);
    const expectedUpdatedAt = existing?.updatedAt;

    setIndexedState(prev => {
      const ws = prev.workspacesById.get(id);
      if (!ws) return prev;

      const updated = { ...ws, ...data, updatedAt: new Date().toISOString() };
      const next = { ...prev };
      next.workspacesById = new Map(prev.workspacesById);
      next.workspacesById.set(id, updated);
      return next;
    });

    trackChange({
      entityType: 'workspace',
      entityId: id,
      operation: 'update',
      data,
    }, expectedUpdatedAt);
  }, [indexedState, trackChange]);

  const deleteWorkspace = useCallback((id: string) => {
    setIndexedState(prev => {
      const next = { ...prev };
      next.workspacesById = new Map(prev.workspacesById);
      next.workspacesById.delete(id);

      // Delete all boards, lists, cards in this workspace
      const boardIds = prev.boardsByWorkspaceId.get(id) || new Set();
      next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
      next.boardsByWorkspaceId.delete(id);

      next.boardsById = new Map(prev.boardsById);
      next.listsByBoardId = new Map(prev.listsByBoardId);
      next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
      next.listsById = new Map(prev.listsById);
      next.cardsByListId = new Map(prev.cardsByListId);
      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      next.cardsById = new Map(prev.cardsById);

      for (const boardId of boardIds) {
        next.boardsById.delete(boardId);
        const listIds = prev.listsByBoardId.get(boardId) || new Set();
        next.listsByBoardId.delete(boardId);
        next.listOrderByBoardId.delete(boardId);

        for (const listId of listIds) {
          next.listsById.delete(listId);
          const cardIds = prev.cardsByListId.get(listId) || new Set();
          next.cardsByListId.delete(listId);
          next.cardOrderByListId.delete(listId);

          for (const cardId of cardIds) {
            next.cardsById.delete(cardId);
          }
        }
      }

      return next;
    });

    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }

    trackChange({
      entityType: 'workspace',
      entityId: id,
      operation: 'delete',
    });
  }, [activeWorkspaceId, trackChange]);

  // O(1) lookup - reconstructs workspace with current boards from indices
  const getWorkspace = useCallback(
    (id: string): Workspace | undefined => {
      const ws = indexedState.workspacesById.get(id);
      if (!ws) return undefined;

      const boardIds = indexedState.boardsByWorkspaceId.get(id) || new Set();
      const boards: Board[] = [];

      for (const boardId of boardIds) {
        const board = indexedState.boardsById.get(boardId);
        if (!board) continue;

        const listOrder = indexedState.listOrderByBoardId.get(boardId) || [];
        const lists: List[] = [];

        for (const listId of listOrder) {
          const list = indexedState.listsById.get(listId);
          if (!list) continue;

          const cardOrder = indexedState.cardOrderByListId.get(listId) || [];
          const cards: Card[] = [];

          for (const cardId of cardOrder) {
            const card = indexedState.cardsById.get(cardId);
            if (card) cards.push(card);
          }

          lists.push({ ...list, cards });
        }

        boards.push({ ...board, lists });
      }

      return { ...ws, boards };
    },
    [indexedState]
  );

  // ===== BOARD OPERATIONS =====

  const createBoard = useCallback(
    (workspaceId: string, data: Partial<Board>, templateType: TemplateType = 'none'): Board => {
      const now = new Date().toISOString();

      let newBoard: Board;

      if (templateType === 'ai-music') {
        newBoard = createAIMusicVideoBoard(workspaceId);
        if (data.name) newBoard.name = data.name;
        if (data.description) newBoard.description = data.description;
      } else if (templateType === 'project-management') {
        newBoard = createProjectManagementBoard(workspaceId);
        if (data.name) newBoard.name = data.name;
        if (data.description) newBoard.description = data.description;
      } else if (templateType === 'software-dev') {
        newBoard = createSoftwareDevelopmentBoard(workspaceId);
        if (data.name) newBoard.name = data.name;
        if (data.description) newBoard.description = data.description;
      } else {
        newBoard = {
          id: generateId(),
          workspaceId,
          name: data.name || 'Untitled Board',
          description: data.description,
          background: data.background,
          createdAt: now,
          updatedAt: now,
          lists: [],
        };
      }

      setIndexedState(prev => {
        const next = { ...prev };
        next.boardsById = new Map(prev.boardsById);
        next.boardsById.set(newBoard.id, newBoard);

        next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
        const wsBoards = new Set<string>(prev.boardsByWorkspaceId.get(workspaceId) || []);
        wsBoards.add(newBoard.id);
        next.boardsByWorkspaceId.set(workspaceId, wsBoards);

        next.listsByBoardId = new Map(prev.listsByBoardId);
        next.listsByBoardId.set(newBoard.id, new Set());
        next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
        next.listOrderByBoardId.set(newBoard.id, []);

        // Add lists and cards from template
        next.listsById = new Map(prev.listsById);
        next.cardsByListId = new Map(prev.cardsByListId);
        next.cardOrderByListId = new Map(prev.cardOrderByListId);
        next.cardsById = new Map(prev.cardsById);

        for (const list of newBoard.lists) {
          next.listsById.set(list.id, list);
          next.listsByBoardId.get(newBoard.id)!.add(list.id);
          next.listOrderByBoardId.get(newBoard.id)!.push(list.id);
          next.cardsByListId.set(list.id, new Set());
          next.cardOrderByListId.set(list.id, []);

          for (const card of list.cards) {
            next.cardsById.set(card.id, card);
            next.cardsByListId.get(list.id)!.add(card.id);
            next.cardOrderByListId.get(list.id)!.push(card.id);
          }
        }

        return next;
      });

      trackChange({
        entityType: 'board',
        entityId: newBoard.id,
        operation: 'create',
        parentId: workspaceId,
        data: newBoard,
      });

      return newBoard;
    },
    [trackChange]
  );

  const updateBoard = useCallback((id: string, data: Partial<Board>) => {
    const existing = indexedState.boardsById.get(id);
    const expectedUpdatedAt = existing?.updatedAt;

    setIndexedState(prev => {
      const board = prev.boardsById.get(id);
      if (!board) return prev;

      const updated = { ...board, ...data, updatedAt: new Date().toISOString() };
      const next = { ...prev };
      next.boardsById = new Map(prev.boardsById);
      next.boardsById.set(id, updated);
      return next;
    });

    trackChange({
      entityType: 'board',
      entityId: id,
      operation: 'update',
      data,
    }, expectedUpdatedAt);
  }, [indexedState, trackChange]);

  const deleteBoard = useCallback(
    (id: string) => {
      setIndexedState(prev => {
        const board = prev.boardsById.get(id);
        if (!board) return prev;

        const next = { ...prev };
        next.boardsById = new Map(prev.boardsById);
        next.boardsById.delete(id);

        next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
        const wsBoards = new Set<string>(prev.boardsByWorkspaceId.get(board.workspaceId) || []);
        wsBoards.delete(id);
        next.boardsByWorkspaceId.set(board.workspaceId, wsBoards);

        // Delete lists and cards
        const listIds = prev.listsByBoardId.get(id) || new Set();
        next.listsByBoardId = new Map(prev.listsByBoardId);
        next.listsByBoardId.delete(id);
        next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
        next.listOrderByBoardId.delete(id);

        next.listsById = new Map(prev.listsById);
        next.cardsByListId = new Map(prev.cardsByListId);
        next.cardOrderByListId = new Map(prev.cardOrderByListId);
        next.cardsById = new Map(prev.cardsById);

        for (const listId of listIds) {
          next.listsById.delete(listId);
          const cardIds = prev.cardsByListId.get(listId) || new Set();
          next.cardsByListId.delete(listId);
          next.cardOrderByListId.delete(listId);

          for (const cardId of cardIds) {
            next.cardsById.delete(cardId);
          }
        }

        return next;
      });

      if (activeBoardId === id) {
        setActiveBoardId(null);
      }

      trackChange({
        entityType: 'board',
        entityId: id,
        operation: 'delete',
      });
    },
    [activeBoardId, trackChange]
  );

  const duplicateBoard = useCallback((id: string): Board | null => {
    const original = indexedState.boardsById.get(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const newBoardId = generateId();

    // Get lists and cards for this board
    const listOrder = indexedState.listOrderByBoardId.get(id) || [];
    const newLists: List[] = [];

    for (const listId of listOrder) {
      const list = indexedState.listsById.get(listId);
      if (!list) continue;

      const newListId = generateId();
      const cardOrder = indexedState.cardOrderByListId.get(listId) || [];
      const newCards: Card[] = [];

      for (const cardId of cardOrder) {
        const card = indexedState.cardsById.get(cardId);
        if (!card) continue;

        newCards.push({
          ...card,
          id: generateId(),
          listId: newListId,
          createdAt: now,
          updatedAt: now,
        });
      }

      newLists.push({
        ...list,
        id: newListId,
        boardId: newBoardId,
        createdAt: now,
        updatedAt: now,
        cards: newCards,
      });
    }

    const duplicatedBoard: Board = {
      ...original,
      id: newBoardId,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      lists: newLists,
    };

    setIndexedState(prev => {
      const next = { ...prev };
      next.boardsById = new Map(prev.boardsById);
      next.boardsById.set(duplicatedBoard.id, duplicatedBoard);

      next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
      const wsBoards = new Set<string>(prev.boardsByWorkspaceId.get(original.workspaceId) || []);
      wsBoards.add(duplicatedBoard.id);
      next.boardsByWorkspaceId.set(original.workspaceId, wsBoards);

      next.listsByBoardId = new Map(prev.listsByBoardId);
      next.listsByBoardId.set(duplicatedBoard.id, new Set());
      next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
      next.listOrderByBoardId.set(duplicatedBoard.id, []);

      next.listsById = new Map(prev.listsById);
      next.cardsByListId = new Map(prev.cardsByListId);
      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      next.cardsById = new Map(prev.cardsById);

      for (const list of newLists) {
        next.listsById.set(list.id, list);
        next.listsByBoardId.get(duplicatedBoard.id)!.add(list.id);
        next.listOrderByBoardId.get(duplicatedBoard.id)!.push(list.id);
        next.cardsByListId.set(list.id, new Set());
        next.cardOrderByListId.set(list.id, []);

        for (const card of list.cards) {
          next.cardsById.set(card.id, card);
          next.cardsByListId.get(list.id)!.add(card.id);
          next.cardOrderByListId.get(list.id)!.push(card.id);
        }
      }

      return next;
    });

    trackChange({
      entityType: 'board',
      entityId: duplicatedBoard.id,
      operation: 'create',
      parentId: original.workspaceId,
      data: duplicatedBoard,
    });

    return duplicatedBoard;
  }, [indexedState, trackChange]);

  const moveBoard = useCallback((boardId: string, targetWorkspaceId: string) => {
    const board = indexedState.boardsById.get(boardId);
    if (!board) return;

    const sourceWorkspaceId = board.workspaceId;
    if (sourceWorkspaceId === targetWorkspaceId) return;

    const expectedUpdatedAt = board.updatedAt;

    setIndexedState(prev => {
      const existingBoard = prev.boardsById.get(boardId);
      if (!existingBoard) return prev;

      const next = { ...prev };

      // Update board with new workspaceId
      next.boardsById = new Map(prev.boardsById);
      next.boardsById.set(boardId, {
        ...existingBoard,
        workspaceId: targetWorkspaceId,
        updatedAt: new Date().toISOString(),
      });

      // Remove from source workspace
      next.boardsByWorkspaceId = new Map(prev.boardsByWorkspaceId);
      const sourceBoards = new Set<string>(prev.boardsByWorkspaceId.get(sourceWorkspaceId) || []);
      sourceBoards.delete(boardId);
      next.boardsByWorkspaceId.set(sourceWorkspaceId, sourceBoards);

      // Add to target workspace
      const targetBoards = new Set<string>(prev.boardsByWorkspaceId.get(targetWorkspaceId) || []);
      targetBoards.add(boardId);
      next.boardsByWorkspaceId.set(targetWorkspaceId, targetBoards);

      return next;
    });

    trackChange({
      entityType: 'board',
      entityId: boardId,
      operation: 'update',
      data: { workspaceId: targetWorkspaceId },
    }, expectedUpdatedAt);
  }, [indexedState, trackChange]);

  // O(1) lookup - reconstructs board with current lists and cards from indices
  const getBoard = useCallback(
    (id: string): Board | undefined => {
      const board = indexedState.boardsById.get(id);
      if (!board) return undefined;

      // Reconstruct lists with current cards from indices
      const listOrder = indexedState.listOrderByBoardId.get(id) || [];
      const lists: List[] = [];

      for (const listId of listOrder) {
        const list = indexedState.listsById.get(listId);
        if (!list) continue;

        const cardOrder = indexedState.cardOrderByListId.get(listId) || [];
        const cards: Card[] = [];

        for (const cardId of cardOrder) {
          const card = indexedState.cardsById.get(cardId);
          if (card) cards.push(card);
        }

        lists.push({ ...list, cards });
      }

      return { ...board, lists };
    },
    [indexedState]
  );

  // ===== LIST OPERATIONS =====

  const createList = useCallback((boardId: string, data: Partial<List>): List => {
    const now = new Date().toISOString();
    const listOrder = indexedState.listOrderByBoardId.get(boardId) || [];

    // Calculate position
    let maxPosition = 0;
    for (const listId of listOrder) {
      const list = indexedState.listsById.get(listId);
      if (list && list.position > maxPosition) {
        maxPosition = list.position;
      }
    }

    const newList: List = {
      id: generateId(),
      boardId,
      name: data.name || 'Untitled List',
      position: data.position ?? maxPosition + 1000,
      color: data.color,
      createdAt: now,
      updatedAt: now,
      cards: [],
    };

    setIndexedState(prev => {
      const next = { ...prev };
      next.listsById = new Map(prev.listsById);
      next.listsById.set(newList.id, newList);

      next.listsByBoardId = new Map(prev.listsByBoardId);
      const boardLists = new Set<string>(prev.listsByBoardId.get(boardId) || []);
      boardLists.add(newList.id);
      next.listsByBoardId.set(boardId, boardLists);

      next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
      const order = [...(prev.listOrderByBoardId.get(boardId) || []), newList.id];
      next.listOrderByBoardId.set(boardId, order);

      next.cardsByListId = new Map(prev.cardsByListId);
      next.cardsByListId.set(newList.id, new Set());
      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      next.cardOrderByListId.set(newList.id, []);

      return next;
    });

    trackChange({
      entityType: 'list',
      entityId: newList.id,
      operation: 'create',
      parentId: boardId,
      data: newList,
    });

    return newList;
  }, [indexedState, trackChange]);

  const updateList = useCallback((id: string, data: Partial<List>) => {
    const existing = indexedState.listsById.get(id);
    const expectedUpdatedAt = existing?.updatedAt;

    setIndexedState(prev => {
      const list = prev.listsById.get(id);
      if (!list) return prev;

      const updated = { ...list, ...data, updatedAt: new Date().toISOString() };
      const next = { ...prev };
      next.listsById = new Map(prev.listsById);
      next.listsById.set(id, updated);
      return next;
    });

    trackChange({
      entityType: 'list',
      entityId: id,
      operation: 'update',
      data,
    }, expectedUpdatedAt);
  }, [indexedState, trackChange]);

  const deleteList = useCallback((id: string) => {
    setIndexedState(prev => {
      const list = prev.listsById.get(id);
      if (!list) return prev;

      const next = { ...prev };
      next.listsById = new Map(prev.listsById);
      next.listsById.delete(id);

      next.listsByBoardId = new Map(prev.listsByBoardId);
      const boardLists = new Set<string>(prev.listsByBoardId.get(list.boardId) || []);
      boardLists.delete(id);
      next.listsByBoardId.set(list.boardId, boardLists);

      next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
      const order = (prev.listOrderByBoardId.get(list.boardId) || []).filter(lid => lid !== id);
      next.listOrderByBoardId.set(list.boardId, order);

      // Delete cards
      const cardIds = prev.cardsByListId.get(id) || new Set();
      next.cardsByListId = new Map(prev.cardsByListId);
      next.cardsByListId.delete(id);
      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      next.cardOrderByListId.delete(id);
      next.cardsById = new Map(prev.cardsById);

      for (const cardId of cardIds) {
        next.cardsById.delete(cardId);
      }

      return next;
    });

    trackChange({
      entityType: 'list',
      entityId: id,
      operation: 'delete',
    });
  }, [trackChange]);

  const reorderLists = useCallback((boardId: string, listIds: string[]) => {
    setIndexedState(prev => {
      const next = { ...prev };
      next.listsById = new Map(prev.listsById);
      next.listOrderByBoardId = new Map(prev.listOrderByBoardId);
      next.listOrderByBoardId.set(boardId, listIds);

      // Update positions
      listIds.forEach((listId, index) => {
        const list = prev.listsById.get(listId);
        if (list) {
          next.listsById.set(listId, { ...list, position: (index + 1) * 1000 });
        }
      });

      return next;
    });

    // Track position updates for each list
    listIds.forEach((listId, index) => {
      trackChange({
        entityType: 'list',
        entityId: listId,
        operation: 'update',
        data: { position: (index + 1) * 1000 },
      });
    });
  }, [trackChange]);

  // O(1) lookup - reconstructs list with current cards from indices
  const getList = useCallback(
    (id: string): List | undefined => {
      const list = indexedState.listsById.get(id);
      if (!list) return undefined;

      const cardOrder = indexedState.cardOrderByListId.get(id) || [];
      const cards: Card[] = [];

      for (const cardId of cardOrder) {
        const card = indexedState.cardsById.get(cardId);
        if (card) cards.push(card);
      }

      return { ...list, cards };
    },
    [indexedState]
  );

  // ===== CARD OPERATIONS =====

  const createCard = useCallback((listId: string, data: Partial<Card>): Card => {
    const now = new Date().toISOString();
    const cardOrder = indexedState.cardOrderByListId.get(listId) || [];

    // Calculate position
    let maxPosition = 0;
    for (const cardId of cardOrder) {
      const card = indexedState.cardsById.get(cardId);
      if (card && card.position > maxPosition) {
        maxPosition = card.position;
      }
    }

    const newCard: Card = {
      id: generateId(),
      listId,
      title: data.title || 'Untitled Card',
      description: data.description,
      position: data.position ?? maxPosition + 1000,
      type: data.type,
      prompt: data.prompt,
      rating: data.rating,
      aiTool: data.aiTool,
      tags: data.tags,
      dueDate: data.dueDate,
      links: data.links,
      responsible: data.responsible,
      jobNumber: data.jobNumber,
      severity: data.severity,
      priority: data.priority,
      effort: data.effort,
      attendees: data.attendees,
      meetingDate: data.meetingDate,
      checklist: data.checklist,
      createdAt: now,
      updatedAt: now,
    };

    setIndexedState(prev => {
      const next = { ...prev };
      next.cardsById = new Map(prev.cardsById);
      next.cardsById.set(newCard.id, newCard);

      next.cardsByListId = new Map(prev.cardsByListId);
      const listCards = new Set<string>(prev.cardsByListId.get(listId) || []);
      listCards.add(newCard.id);
      next.cardsByListId.set(listId, listCards);

      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      const order = [...(prev.cardOrderByListId.get(listId) || []), newCard.id];
      next.cardOrderByListId.set(listId, order);

      return next;
    });

    trackChange({
      entityType: 'card',
      entityId: newCard.id,
      operation: 'create',
      parentId: listId,
      data: newCard,
    });

    return newCard;
  }, [indexedState, trackChange]);

  const updateCard = useCallback((id: string, data: Partial<Card>) => {
    const existing = indexedState.cardsById.get(id);
    const expectedUpdatedAt = existing?.updatedAt;

    setIndexedState(prev => {
      const card = prev.cardsById.get(id);
      if (!card) return prev;

      const updated = { ...card, ...data, updatedAt: new Date().toISOString() };
      const next = { ...prev };
      next.cardsById = new Map(prev.cardsById);
      next.cardsById.set(id, updated);
      return next;
    });

    trackChange({
      entityType: 'card',
      entityId: id,
      operation: 'update',
      data,
    }, expectedUpdatedAt);
  }, [indexedState, trackChange]);

  const deleteCard = useCallback((id: string) => {
    setIndexedState(prev => {
      const card = prev.cardsById.get(id);
      if (!card) return prev;

      const next = { ...prev };
      next.cardsById = new Map(prev.cardsById);
      next.cardsById.delete(id);

      next.cardsByListId = new Map(prev.cardsByListId);
      const listCards = new Set<string>(prev.cardsByListId.get(card.listId) || []);
      listCards.delete(id);
      next.cardsByListId.set(card.listId, listCards);

      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      const order = (prev.cardOrderByListId.get(card.listId) || []).filter(cid => cid !== id);
      next.cardOrderByListId.set(card.listId, order);

      return next;
    });

    trackChange({
      entityType: 'card',
      entityId: id,
      operation: 'delete',
    });
  }, [trackChange]);

  const moveCard = useCallback(
    (cardId: string, targetListId: string, targetIndex: number) => {
      let newPosition: number | undefined;
      let sourceListId: string | undefined;

      setIndexedState(prev => {
        const card = prev.cardsById.get(cardId);
        if (!card) return prev;

        sourceListId = card.listId;
        const next = { ...prev };
        next.cardsById = new Map(prev.cardsById);
        next.cardsByListId = new Map(prev.cardsByListId);
        next.cardOrderByListId = new Map(prev.cardOrderByListId);

        // Remove from source list
        const sourceCards = new Set<string>(prev.cardsByListId.get(sourceListId) || []);
        sourceCards.delete(cardId);
        next.cardsByListId.set(sourceListId, sourceCards);

        const sourceOrder = [...(prev.cardOrderByListId.get(sourceListId) || [])];
        const srcIdx = sourceOrder.indexOf(cardId);
        if (srcIdx !== -1) sourceOrder.splice(srcIdx, 1);
        next.cardOrderByListId.set(sourceListId, sourceOrder);

        // Add to target list
        const targetCards = new Set<string>(prev.cardsByListId.get(targetListId) || []);
        targetCards.add(cardId);
        next.cardsByListId.set(targetListId, targetCards);

        // Get target order (use updated source if same list)
        const targetOrder = sourceListId === targetListId
          ? sourceOrder
          : [...(prev.cardOrderByListId.get(targetListId) || [])];

        // Calculate position based on surrounding cards
        const beforeCard = targetIndex > 0 ? prev.cardsById.get(targetOrder[targetIndex - 1]) : null;
        const afterCard = targetOrder[targetIndex] ? prev.cardsById.get(targetOrder[targetIndex]) : null;
        newPosition = calculateCardPosition(beforeCard || null, afterCard || null);

        targetOrder.splice(targetIndex, 0, cardId);
        next.cardOrderByListId.set(targetListId, targetOrder);

        // Update card with new listId and position
        const updatedCard = {
          ...card,
          listId: targetListId,
          position: newPosition,
          updatedAt: new Date().toISOString(),
        };
        next.cardsById.set(cardId, updatedCard);

        return next;
      });

      // Track change after state update
      if (newPosition !== undefined) {
        trackChange({
          entityType: 'card',
          entityId: cardId,
          operation: 'update',
          data: { listId: targetListId, position: newPosition },
        });
      }
    },
    [trackChange]
  );

  const duplicateCard = useCallback((id: string): Card | null => {
    const original = indexedState.cardsById.get(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const duplicatedCard: Card = {
      ...original,
      id: generateId(),
      title: `${original.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    setIndexedState(prev => {
      const next = { ...prev };
      next.cardsById = new Map(prev.cardsById);
      next.cardsById.set(duplicatedCard.id, duplicatedCard);

      next.cardsByListId = new Map(prev.cardsByListId);
      const listCards = new Set<string>(prev.cardsByListId.get(original.listId) || []);
      listCards.add(duplicatedCard.id);
      next.cardsByListId.set(original.listId, listCards);

      next.cardOrderByListId = new Map(prev.cardOrderByListId);
      const order = [...(prev.cardOrderByListId.get(original.listId) || []), duplicatedCard.id];
      next.cardOrderByListId.set(original.listId, order);

      return next;
    });

    trackChange({
      entityType: 'card',
      entityId: duplicatedCard.id,
      operation: 'create',
      parentId: original.listId,
      data: duplicatedCard,
    });

    return duplicatedCard;
  }, [indexedState, trackChange]);

  // O(1) lookup
  const getCard = useCallback(
    (id: string): Card | undefined => {
      return indexedState.cardsById.get(id);
    },
    [indexedState]
  );

  // ===== STORAGE OPERATIONS =====

  const exportData = useCallback(() => {
    exportDataUtil({ workspaces });
  }, [workspaces]);

  const importData = useCallback(async (file: File) => {
    try {
      const data = await importDataUtil(file);
      const normalized = normalizeToIndexedState(data.workspaces);
      setIndexedState(normalized);
      // Force full save after import
      setPendingChanges([]);
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces: data.workspaces }),
      });
    } catch (error) {
      throw error;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setIndexedState(createEmptyIndexedState());
    setActiveWorkspaceId(null);
    setActiveBoardId(null);
    setPendingChanges([]);
  }, []);

  const getStorageSize = useCallback((): StorageInfo => {
    const dataStr = JSON.stringify({ workspaces });
    const bytes = new Blob([dataStr]).size;
    const totalBytes = 256 * 1024 * 1024;
    return {
      bytes,
      mb: bytes / (1024 * 1024),
      percentage: (bytes / totalBytes) * 100,
    };
  }, [workspaces]);

  // ===== NAVIGATION =====

  const setActiveWorkspace = useCallback((id: string | null) => {
    setActiveWorkspaceId(id);
  }, []);

  const setActiveBoard = useCallback((id: string | null) => {
    setActiveBoardId(id);
  }, []);

  const value: DataContextType = {
    workspaces,
    activeWorkspaceId,
    activeBoardId,
    isInitialized,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspace,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    moveBoard,
    getBoard,
    createList,
    updateList,
    deleteList,
    reorderLists,
    getList,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    duplicateCard,
    getCard,
    exportData,
    importData,
    clearAllData,
    getStorageSize,
    setActiveWorkspace,
    setActiveBoard,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      <ConflictModal
        conflict={currentConflict}
        onOverwrite={handleConflictOverwrite}
        onDiscard={handleConflictDiscard}
        onClose={() => setCurrentConflict(null)}
      />
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
