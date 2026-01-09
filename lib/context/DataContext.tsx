'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Workspace, Board, List, Card, AppData, StorageInfo } from '@/types';
import { storage } from '@/lib/storage/localStorage';
import { exportData as exportDataUtil } from '@/lib/storage/export';
import { importData as importDataUtil } from '@/lib/storage/import';
import { createTemplateBoard } from '@/lib/storage/template';
import { generateId } from '@/lib/utils/id';
import { throttle } from '@/lib/utils/debounce';
import { calculateCardPosition, calculateListPosition } from '@/lib/utils/position';

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
  createBoard: (workspaceId: string, data: Partial<Board>, useTemplate?: boolean) => Board;
  updateBoard: (id: string, data: Partial<Board>) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (id: string) => Board | null;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const data = storage.load();
    if (data && data.workspaces) {
      setWorkspaces(data.workspaces);
    }
    setIsInitialized(true);
  }, []);

  // Throttled save to localStorage (max once per second)
  const saveToStorage = useMemo(
    () =>
      throttle((data: AppData) => {
        const result = storage.save(data);
        if (!result.success) {
          console.error('Failed to save:', result.error);
        }
      }, 1000),
    []
  );

  // Auto-save on data changes
  useEffect(() => {
    if (isInitialized && workspaces.length >= 0) {
      saveToStorage({ workspaces });
    }
  }, [workspaces, isInitialized, saveToStorage]);

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

    setWorkspaces((prev) => [...prev, newWorkspace]);
    return newWorkspace;
  }, []);

  const updateWorkspace = useCallback((id: string, data: Partial<Workspace>) => {
    setWorkspaces((prev) =>
      prev.map((ws) =>
        ws.id === id ? { ...ws, ...data, updatedAt: new Date().toISOString() } : ws
      )
    );
  }, []);

  const deleteWorkspace = useCallback((id: string) => {
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }
  }, [activeWorkspaceId]);

  const getWorkspace = useCallback(
    (id: string): Workspace | undefined => {
      return workspaces.find((ws) => ws.id === id);
    },
    [workspaces]
  );

  // ===== BOARD OPERATIONS =====

  const createBoard = useCallback(
    (workspaceId: string, data: Partial<Board>, useTemplate = false): Board => {
      const now = new Date().toISOString();

      let newBoard: Board;

      if (useTemplate) {
        // Use template board
        newBoard = createTemplateBoard(workspaceId);
        if (data.name) {
          newBoard.name = data.name;
        }
        if (data.description) {
          newBoard.description = data.description;
        }
      } else {
        // Create empty board
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

      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === workspaceId ? { ...ws, boards: [...ws.boards, newBoard] } : ws
        )
      );

      return newBoard;
    },
    []
  );

  const updateBoard = useCallback((id: string, data: Partial<Board>) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) =>
          board.id === id ? { ...board, ...data, updatedAt: new Date().toISOString() } : board
        ),
      }))
    );
  }, []);

  const deleteBoard = useCallback(
    (id: string) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          boards: ws.boards.filter((board) => board.id !== id),
        }))
      );
      if (activeBoardId === id) {
        setActiveBoardId(null);
      }
    },
    [activeBoardId]
  );

  const duplicateBoard = useCallback((id: string): Board | null => {
    let duplicatedBoard: Board | null = null;

    setWorkspaces((prev) =>
      prev.map((ws) => {
        const originalBoard = ws.boards.find((b) => b.id === id);
        if (!originalBoard) return ws;

        const now = new Date().toISOString();
        duplicatedBoard = {
          ...originalBoard,
          id: generateId(),
          name: `${originalBoard.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
          lists: originalBoard.lists.map((list) => ({
            ...list,
            id: generateId(),
            boardId: duplicatedBoard!.id,
            createdAt: now,
            updatedAt: now,
            cards: list.cards.map((card) => ({
              ...card,
              id: generateId(),
              listId: list.id,
              createdAt: now,
              updatedAt: now,
            })),
          })),
        };

        return {
          ...ws,
          boards: [...ws.boards, duplicatedBoard!],
        };
      })
    );

    return duplicatedBoard;
  }, []);

  const getBoard = useCallback(
    (id: string): Board | undefined => {
      for (const ws of workspaces) {
        const board = ws.boards.find((b) => b.id === id);
        if (board) return board;
      }
      return undefined;
    },
    [workspaces]
  );

  // ===== LIST OPERATIONS =====

  const createList = useCallback((boardId: string, data: Partial<List>): List => {
    const now = new Date().toISOString();
    let newList: List | null = null;

    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => {
          if (board.id !== boardId) return board;

          // Calculate position (at the end)
          const maxPosition =
            board.lists.length > 0
              ? Math.max(...board.lists.map((l) => l.position))
              : 0;

          newList = {
            id: generateId(),
            boardId,
            name: data.name || 'Untitled List',
            position: data.position ?? maxPosition + 1000,
            createdAt: now,
            updatedAt: now,
            cards: [],
          };

          return {
            ...board,
            lists: [...board.lists, newList],
          };
        }),
      }))
    );

    return newList!;
  }, []);

  const updateList = useCallback((id: string, data: Partial<List>) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.map((list) =>
            list.id === id ? { ...list, ...data, updatedAt: new Date().toISOString() } : list
          ),
        })),
      }))
    );
  }, []);

  const deleteList = useCallback((id: string) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.filter((list) => list.id !== id),
        })),
      }))
    );
  }, []);

  const reorderLists = useCallback((boardId: string, listIds: string[]) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => {
          if (board.id !== boardId) return board;

          const reorderedLists = listIds
            .map((id, index) => {
              const list = board.lists.find((l) => l.id === id);
              return list ? { ...list, position: (index + 1) * 1000 } : null;
            })
            .filter((l): l is List => l !== null);

          return { ...board, lists: reorderedLists };
        }),
      }))
    );
  }, []);

  const getList = useCallback(
    (id: string): List | undefined => {
      for (const ws of workspaces) {
        for (const board of ws.boards) {
          const list = board.lists.find((l) => l.id === id);
          if (list) return list;
        }
      }
      return undefined;
    },
    [workspaces]
  );

  // ===== CARD OPERATIONS =====

  const createCard = useCallback((listId: string, data: Partial<Card>): Card => {
    const now = new Date().toISOString();
    let newCard: Card | null = null;

    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.map((list) => {
            if (list.id !== listId) return list;

            // Calculate position (at the end)
            const maxPosition =
              list.cards.length > 0
                ? Math.max(...list.cards.map((c) => c.position))
                : 0;

            newCard = {
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
              createdAt: now,
              updatedAt: now,
            };

            return {
              ...list,
              cards: [...list.cards, newCard],
            };
          }),
        })),
      }))
    );

    return newCard!;
  }, []);

  const updateCard = useCallback((id: string, data: Partial<Card>) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.map((list) => ({
            ...list,
            cards: list.cards.map((card) =>
              card.id === id ? { ...card, ...data, updatedAt: new Date().toISOString() } : card
            ),
          })),
        })),
      }))
    );
  }, []);

  const deleteCard = useCallback((id: string) => {
    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.map((list) => ({
            ...list,
            cards: list.cards.filter((card) => card.id !== id),
          })),
        })),
      }))
    );
  }, []);

  const moveCard = useCallback(
    (cardId: string, targetListId: string, targetIndex: number) => {
      setWorkspaces((prev) =>
        prev.map((ws) => ({
          ...ws,
          boards: ws.boards.map((board) => {
            // Find the card
            let movedCard: Card | null = null;
            let sourceListId: string | null = null;

            for (const list of board.lists) {
              const card = list.cards.find((c) => c.id === cardId);
              if (card) {
                movedCard = card;
                sourceListId = list.id;
                break;
              }
            }

            if (!movedCard || !sourceListId) return board;

            // Remove from source list
            const listsWithoutCard = board.lists.map((list) =>
              list.id === sourceListId
                ? { ...list, cards: list.cards.filter((c) => c.id !== cardId) }
                : list
            );

            // Add to target list at target index
            const updatedLists = listsWithoutCard.map((list) => {
              if (list.id !== targetListId) return list;

              const targetCards = [...list.cards];

              // Calculate position
              const beforeCard = targetCards[targetIndex - 1] || null;
              const afterCard = targetCards[targetIndex] || null;
              const newPosition = calculateCardPosition(beforeCard, afterCard);

              const updatedCard = {
                ...movedCard!,
                listId: targetListId,
                position: newPosition,
                updatedAt: new Date().toISOString(),
              };

              targetCards.splice(targetIndex, 0, updatedCard);

              return { ...list, cards: targetCards };
            });

            return { ...board, lists: updatedLists };
          }),
        }))
      );
    },
    []
  );

  const duplicateCard = useCallback((id: string): Card | null => {
    let duplicatedCard: Card | null = null;

    setWorkspaces((prev) =>
      prev.map((ws) => ({
        ...ws,
        boards: ws.boards.map((board) => ({
          ...board,
          lists: board.lists.map((list) => {
            const originalCard = list.cards.find((c) => c.id === id);
            if (!originalCard) return list;

            const now = new Date().toISOString();
            duplicatedCard = {
              ...originalCard,
              id: generateId(),
              title: `${originalCard.title} (Copy)`,
              createdAt: now,
              updatedAt: now,
            };

            return {
              ...list,
              cards: [...list.cards, duplicatedCard!],
            };
          }),
        })),
      }))
    );

    return duplicatedCard;
  }, []);

  const getCard = useCallback(
    (id: string): Card | undefined => {
      for (const ws of workspaces) {
        for (const board of ws.boards) {
          for (const list of board.lists) {
            const card = list.cards.find((c) => c.id === id);
            if (card) return card;
          }
        }
      }
      return undefined;
    },
    [workspaces]
  );

  // ===== STORAGE OPERATIONS =====

  const exportData = useCallback(() => {
    exportDataUtil({ workspaces });
  }, [workspaces]);

  const importData = useCallback(async (file: File) => {
    try {
      const data = await importDataUtil(file);
      setWorkspaces(data.workspaces);
    } catch (error) {
      throw error;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setWorkspaces([]);
    setActiveWorkspaceId(null);
    setActiveBoardId(null);
    storage.clear();
  }, []);

  const getStorageSize = useCallback((): StorageInfo => {
    return storage.getSize();
  }, []);

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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
