/**
 * Storage Adapter Interface
 * Abstract interface for storage operations
 * Implementations: LocalStorageAdapter, SupabaseAdapter
 */

import type { Workspace, Board, List, Card } from '@/types'

export interface StorageAdapter {
  // Storage mode
  getMode(): 'local' | 'cloud'

  // Workspaces
  getWorkspaces(): Promise<Workspace[]>
  getWorkspace(id: string): Promise<Workspace | null>
  createWorkspace(data: Partial<Workspace>): Promise<Workspace>
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace>
  deleteWorkspace(id: string): Promise<void>

  // Boards
  getBoards(workspaceId: string): Promise<Board[]>
  getBoard(id: string): Promise<Board | null>
  createBoard(workspaceId: string, data: Partial<Board>): Promise<Board>
  updateBoard(id: string, data: Partial<Board>): Promise<Board>
  deleteBoard(id: string): Promise<void>

  // Lists
  getLists(boardId: string): Promise<List[]>
  getList(id: string): Promise<List | null>
  createList(boardId: string, data: Partial<List>): Promise<List>
  updateList(id: string, data: Partial<List>): Promise<List>
  deleteList(id: string): Promise<void>
  reorderLists(boardId: string, listIds: string[]): Promise<void>

  // Cards
  getCards(listId: string): Promise<Card[]>
  getCard(id: string): Promise<Card | null>
  createCard(listId: string, data: Partial<Card>): Promise<Card>
  updateCard(id: string, data: Partial<Card>): Promise<Card>
  deleteCard(id: string): Promise<void>
  moveCard(cardId: string, targetListId: string, position: number): Promise<void>
  reorderCards(listId: string, cardIds: string[]): Promise<void>

  // Bulk operations
  getAllData(): Promise<{ workspaces: Workspace[] }>
  importData(data: { workspaces: Workspace[] }): Promise<void>
  clearAllData(): Promise<void>
}

/**
 * Storage Adapter Factory
 * Creates the appropriate adapter based on mode
 */
export type StorageMode = 'local' | 'cloud'

export interface StorageAdapterFactory {
  create(mode: StorageMode): StorageAdapter
}
