/**
 * LocalStorage Adapter
 * Implements StorageAdapter interface for localStorage
 * Maintains compatibility with existing localStorage structure
 */

import type { Workspace, Board, List, Card, AppData } from '@/types'
import type { StorageAdapter } from './storage-adapter'
import { storage } from '../localStorage'
import { generateId } from '@/lib/utils/id'

export class LocalStorageAdapter implements StorageAdapter {
  getMode(): 'local' | 'cloud' {
    return 'local'
  }

  private getData(): AppData {
    return storage.load() || { workspaces: [] }
  }

  private saveData(data: AppData): void {
    storage.save(data)
  }

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const data = this.getData()
    return data.workspaces
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const data = this.getData()
    return data.workspaces.find(w => w.id === id) || null
  }

  async createWorkspace(workspaceData: Partial<Workspace>): Promise<Workspace> {
    const data = this.getData()
    const now = new Date().toISOString()

    const workspace: Workspace = {
      id: workspaceData.id || generateId(),
      name: workspaceData.name || 'New Workspace',
      description: workspaceData.description,
      icon: workspaceData.icon,
      color: workspaceData.color,
      createdAt: workspaceData.createdAt || now,
      updatedAt: now,
      boards: workspaceData.boards || [],
    }

    data.workspaces.push(workspace)
    this.saveData(data)
    return workspace
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    const data = this.getData()
    const workspace = data.workspaces.find(w => w.id === id)

    if (!workspace) {
      throw new Error(`Workspace ${id} not found`)
    }

    Object.assign(workspace, updates, { updatedAt: new Date().toISOString() })
    this.saveData(data)
    return workspace
  }

  async deleteWorkspace(id: string): Promise<void> {
    const data = this.getData()
    data.workspaces = data.workspaces.filter(w => w.id !== id)
    this.saveData(data)
  }

  // Boards
  async getBoards(workspaceId: string): Promise<Board[]> {
    const workspace = await this.getWorkspace(workspaceId)
    return workspace?.boards || []
  }

  async getBoard(id: string): Promise<Board | null> {
    const data = this.getData()
    for (const workspace of data.workspaces) {
      const board = workspace.boards.find(b => b.id === id)
      if (board) return board
    }
    return null
  }

  async createBoard(workspaceId: string, boardData: Partial<Board>): Promise<Board> {
    const data = this.getData()
    const workspace = data.workspaces.find(w => w.id === workspaceId)

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`)
    }

    const now = new Date().toISOString()
    const board: Board = {
      id: boardData.id || generateId(),
      workspaceId,
      name: boardData.name || 'New Board',
      description: boardData.description,
      background: boardData.background,
      allowedCardTypes: boardData.allowedCardTypes,
      createdAt: boardData.createdAt || now,
      updatedAt: now,
      lists: boardData.lists || [],
    }

    workspace.boards.push(board)
    workspace.updatedAt = now
    this.saveData(data)
    return board
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      const board = workspace.boards.find(b => b.id === id)
      if (board) {
        Object.assign(board, updates, { updatedAt: new Date().toISOString() })
        workspace.updatedAt = new Date().toISOString()
        this.saveData(data)
        return board
      }
    }

    throw new Error(`Board ${id} not found`)
  }

  async deleteBoard(id: string): Promise<void> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      const index = workspace.boards.findIndex(b => b.id === id)
      if (index !== -1) {
        workspace.boards.splice(index, 1)
        workspace.updatedAt = new Date().toISOString()
        this.saveData(data)
        return
      }
    }

    throw new Error(`Board ${id} not found`)
  }

  // Lists
  async getLists(boardId: string): Promise<List[]> {
    const board = await this.getBoard(boardId)
    return board?.lists || []
  }

  async getList(id: string): Promise<List | null> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        const list = board.lists.find(l => l.id === id)
        if (list) return list
      }
    }
    return null
  }

  async createList(boardId: string, listData: Partial<List>): Promise<List> {
    const data = this.getData()
    const board = await this.getBoard(boardId)

    if (!board) {
      throw new Error(`Board ${boardId} not found`)
    }

    const now = new Date().toISOString()
    const list: List = {
      id: listData.id || generateId(),
      boardId,
      name: listData.name || 'New List',
      position: listData.position ?? board.lists.length,
      createdAt: listData.createdAt || now,
      updatedAt: now,
      cards: listData.cards || [],
    }

    board.lists.push(list)
    board.updatedAt = now
    this.saveData(data)
    return list
  }

  async updateList(id: string, updates: Partial<List>): Promise<List> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        const list = board.lists.find(l => l.id === id)
        if (list) {
          Object.assign(list, updates, { updatedAt: new Date().toISOString() })
          board.updatedAt = new Date().toISOString()
          this.saveData(data)
          return list
        }
      }
    }

    throw new Error(`List ${id} not found`)
  }

  async deleteList(id: string): Promise<void> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        const index = board.lists.findIndex(l => l.id === id)
        if (index !== -1) {
          board.lists.splice(index, 1)
          board.updatedAt = new Date().toISOString()
          this.saveData(data)
          return
        }
      }
    }

    throw new Error(`List ${id} not found`)
  }

  async reorderLists(boardId: string, listIds: string[]): Promise<void> {
    const data = this.getData()
    const board = await this.getBoard(boardId)

    if (!board) {
      throw new Error(`Board ${boardId} not found`)
    }

    // Reorder lists based on listIds array
    const reorderedLists = listIds
      .map((id, index) => {
        const list = board.lists.find(l => l.id === id)
        if (list) {
          list.position = index
          return list
        }
        return null
      })
      .filter(Boolean) as List[]

    board.lists = reorderedLists
    board.updatedAt = new Date().toISOString()
    this.saveData(data)
  }

  // Cards
  async getCards(listId: string): Promise<Card[]> {
    const list = await this.getList(listId)
    return list?.cards || []
  }

  async getCard(id: string): Promise<Card | null> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        for (const list of board.lists) {
          const card = list.cards.find(c => c.id === id)
          if (card) return card
        }
      }
    }
    return null
  }

  async createCard(listId: string, cardData: Partial<Card>): Promise<Card> {
    const data = this.getData()
    const list = await this.getList(listId)

    if (!list) {
      throw new Error(`List ${listId} not found`)
    }

    const now = new Date().toISOString()
    const card: Card = {
      id: cardData.id || generateId(),
      listId,
      title: cardData.title || 'New Card',
      description: cardData.description,
      position: cardData.position ?? list.cards.length,
      type: cardData.type,
      prompt: cardData.prompt,
      rating: cardData.rating,
      aiTool: cardData.aiTool,
      responsible: cardData.responsible,
      jobNumber: cardData.jobNumber,
      severity: cardData.severity,
      priority: cardData.priority,
      effort: cardData.effort,
      attendees: cardData.attendees,
      meetingDate: cardData.meetingDate,
      tags: cardData.tags,
      links: cardData.links,
      dueDate: cardData.dueDate,
      createdAt: cardData.createdAt || now,
      updatedAt: now,
    }

    list.cards.push(card)
    list.updatedAt = now
    this.saveData(data)
    return card
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        for (const list of board.lists) {
          const card = list.cards.find(c => c.id === id)
          if (card) {
            Object.assign(card, updates, { updatedAt: new Date().toISOString() })
            list.updatedAt = new Date().toISOString()
            this.saveData(data)
            return card
          }
        }
      }
    }

    throw new Error(`Card ${id} not found`)
  }

  async deleteCard(id: string): Promise<void> {
    const data = this.getData()

    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        for (const list of board.lists) {
          const index = list.cards.findIndex(c => c.id === id)
          if (index !== -1) {
            list.cards.splice(index, 1)
            list.updatedAt = new Date().toISOString()
            this.saveData(data)
            return
          }
        }
      }
    }

    throw new Error(`Card ${id} not found`)
  }

  async moveCard(cardId: string, targetListId: string, position: number): Promise<void> {
    const data = this.getData()
    const card = await this.getCard(cardId)

    if (!card) {
      throw new Error(`Card ${cardId} not found`)
    }

    // Remove card from current list
    for (const workspace of data.workspaces) {
      for (const board of workspace.boards) {
        for (const list of board.lists) {
          const index = list.cards.findIndex(c => c.id === cardId)
          if (index !== -1) {
            list.cards.splice(index, 1)
            list.updatedAt = new Date().toISOString()
            break
          }
        }
      }
    }

    // Add card to target list
    const targetList = await this.getList(targetListId)
    if (!targetList) {
      throw new Error(`Target list ${targetListId} not found`)
    }

    card.listId = targetListId
    card.position = position
    card.updatedAt = new Date().toISOString()
    targetList.cards.splice(position, 0, card)
    targetList.updatedAt = new Date().toISOString()

    // Reorder positions
    targetList.cards.forEach((c, i) => {
      c.position = i
    })

    this.saveData(data)
  }

  async reorderCards(listId: string, cardIds: string[]): Promise<void> {
    const data = this.getData()
    const list = await this.getList(listId)

    if (!list) {
      throw new Error(`List ${listId} not found`)
    }

    // Reorder cards based on cardIds array
    const reorderedCards = cardIds
      .map((id, index) => {
        const card = list.cards.find(c => c.id === id)
        if (card) {
          card.position = index
          return card
        }
        return null
      })
      .filter(Boolean) as Card[]

    list.cards = reorderedCards
    list.updatedAt = new Date().toISOString()
    this.saveData(data)
  }

  // Bulk operations
  async getAllData(): Promise<{ workspaces: Workspace[] }> {
    return this.getData()
  }

  async importData(data: { workspaces: Workspace[] }): Promise<void> {
    this.saveData(data)
  }

  async clearAllData(): Promise<void> {
    storage.clear()
  }
}
