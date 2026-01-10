/**
 * Supabase Adapter
 * Implements StorageAdapter interface for Supabase database
 * Handles relational data structure and user authentication
 */

import type { Workspace, Board, List, Card } from '@/types'
import type { StorageAdapter } from './storage-adapter'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type SupabaseClient = ReturnType<typeof getSupabaseBrowserClient>

/**
 * Helper to convert snake_case to camelCase
 */
function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as any
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const converted: any = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    converted[camelKey] = toCamelCase(obj[key])
  }
  return converted
}

/**
 * Helper to convert camelCase to snake_case
 */
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item))
  }

  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const converted: any = {}
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    converted[snakeKey] = toSnakeCase(obj[key])
  }
  return converted
}

export class SupabaseAdapter implements StorageAdapter {
  private supabase: SupabaseClient
  private userId: string | null = null

  constructor() {
    this.supabase = getSupabaseBrowserClient()
    this.initializeAuth()
  }

  private async initializeAuth() {
    const { data: { user } } = await this.supabase.auth.getUser()
    this.userId = user?.id || null
  }

  private async ensureAuth(): Promise<string> {
    if (!this.userId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }
      this.userId = user.id
      return user.id
    }
    return this.userId
  }

  getMode(): 'local' | 'cloud' {
    return 'cloud'
  }

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    const userId = await this.ensureAuth()

    const { data: workspacesData, error: workspacesError } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (workspacesError || !workspacesData) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError?.message}`)
    }

    // Fetch all boards for these workspaces
    const workspaceIds = workspacesData.map((w: any) => w.id)

    const { data: boardsData, error: boardsError } = await this.supabase
      .from('boards')
      .select('*')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: true })

    if (boardsError || !boardsData) {
      throw new Error(`Failed to fetch boards: ${boardsError?.message}`)
    }

    // Fetch all lists for these boards
    const boardIds = boardsData.map((b: any) => b.id)

    const { data: listsData, error: listsError } = await this.supabase
      .from('lists')
      .select('*')
      .in('board_id', boardIds)
      .order('position', { ascending: true })

    if (listsError || !listsData) {
      throw new Error(`Failed to fetch lists: ${listsError?.message}`)
    }

    // Fetch all cards for these lists
    const listIds = listsData.map((l: any) => l.id)

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    // Reconstruct nested structure
    return workspacesData.map((workspace: any) => {
      const boards = boardsData
        .filter((board: any) => board.workspace_id === workspace.id)
        .map((board: any) => {
          const lists = listsData
            .filter((list: any) => list.board_id === board.id)
            .map((list: any) => {
              const cards = cardsData
                .filter((card: any) => card.list_id === list.id)
                .map((card: any) => toCamelCase<Card>(card))

              return toCamelCase<List>({ ...list, cards })
            })

          return toCamelCase<Board>({ ...board, lists })
        })

      return toCamelCase<Workspace>({ ...workspace, boards })
    })
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const userId = await this.ensureAuth()

    const { data: workspaceData, error: workspaceError } = await this.supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (workspaceError) {
      if (workspaceError.code === 'PGRST116') return null
      throw new Error(`Failed to fetch workspace: ${workspaceError.message}`)
    }

    // Fetch boards for this workspace
    const { data: boardsData, error: boardsError } = await this.supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', id)
      .order('created_at', { ascending: true })

    if (boardsError) {
      throw new Error(`Failed to fetch boards: ${boardsError.message}`)
    }

    // Fetch lists and cards for each board
    const boardIds = boardsData.map((b: any) => b.id)

    const { data: listsData, error: listsError } = await this.supabase
      .from('lists')
      .select('*')
      .in('board_id', boardIds)
      .order('position', { ascending: true })

    if (listsError) {
      throw new Error(`Failed to fetch lists: ${listsError.message}`)
    }

    const listIds = listsData.map((l: any) => l.id)

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    // Reconstruct nested structure
    const boards = boardsData.map((board: any) => {
      const lists = listsData
        .filter((list: any) => list.board_id === board.id)
        .map((list: any) => {
          const cards = cardsData
            .filter((card: any) => card.list_id === list.id)
            .map((card: any) => toCamelCase<Card>(card))

          return toCamelCase<List>({ ...list, cards })
        })

      return toCamelCase<Board>({ ...board, lists })
    })

    return toCamelCase<Workspace>({ ...workspaceData, boards })
  }

  async createWorkspace(data: Partial<Workspace>): Promise<Workspace> {
    const userId = await this.ensureAuth()

    const { data: workspaceData, error } = await this.supabase
      .from('workspaces')
      .insert({
        user_id: userId,
        name: data.name || 'New Workspace',
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`)
    }

    return toCamelCase<Workspace>({ ...workspaceData, boards: [] })
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    const userId = await this.ensureAuth()

    const updateData = toSnakeCase({
      name: updates.name,
      description: updates.description,
      icon: updates.icon,
      color: updates.color,
    })

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const { data, error } = await this.supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update workspace: ${error.message}`)
    }

    // Fetch complete workspace with nested data
    return (await this.getWorkspace(id))!
  }

  async deleteWorkspace(id: string): Promise<void> {
    const userId = await this.ensureAuth()

    const { error } = await this.supabase
      .from('workspaces')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete workspace: ${error.message}`)
    }
  }

  // Boards
  async getBoards(workspaceId: string): Promise<Board[]> {
    const userId = await this.ensureAuth()

    const { data: boardsData, error: boardsError } = await this.supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (boardsError) {
      throw new Error(`Failed to fetch boards: ${boardsError.message}`)
    }

    const boardIds = boardsData.map((b: any) => b.id)

    const { data: listsData, error: listsError } = await this.supabase
      .from('lists')
      .select('*')
      .in('board_id', boardIds)
      .order('position', { ascending: true })

    if (listsError) {
      throw new Error(`Failed to fetch lists: ${listsError.message}`)
    }

    const listIds = listsData.map((l: any) => l.id)

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    return boardsData.map((board: any) => {
      const lists = listsData
        .filter((list: any) => list.board_id === board.id)
        .map((list: any) => {
          const cards = cardsData
            .filter((card: any) => card.list_id === list.id)
            .map((card: any) => toCamelCase<Card>(card))

          return toCamelCase<List>({ ...list, cards })
        })

      return toCamelCase<Board>({ ...board, lists })
    })
  }

  async getBoard(id: string): Promise<Board | null> {
    const userId = await this.ensureAuth()

    const { data: boardData, error: boardError } = await this.supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (boardError) {
      if (boardError.code === 'PGRST116') return null
      throw new Error(`Failed to fetch board: ${boardError.message}`)
    }

    const { data: listsData, error: listsError } = await this.supabase
      .from('lists')
      .select('*')
      .eq('board_id', id)
      .order('position', { ascending: true })

    if (listsError) {
      throw new Error(`Failed to fetch lists: ${listsError.message}`)
    }

    const listIds = listsData.map((l: any) => l.id)

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    const lists = listsData.map((list: any) => {
      const cards = cardsData
        .filter((card: any) => card.list_id === list.id)
        .map((card: any) => toCamelCase<Card>(card))

      return toCamelCase<List>({ ...list, cards })
    })

    return toCamelCase<Board>({ ...boardData, lists })
  }

  async createBoard(workspaceId: string, data: Partial<Board>): Promise<Board> {
    const userId = await this.ensureAuth()

    const { data: boardData, error } = await this.supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        name: data.name || 'New Board',
        description: data.description || null,
        background: data.background || null,
        allowed_card_types: data.allowedCardTypes || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create board: ${error.message}`)
    }

    return toCamelCase<Board>({ ...boardData, lists: [] })
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    const userId = await this.ensureAuth()

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.background !== undefined) updateData.background = updates.background
    if (updates.allowedCardTypes !== undefined) updateData.allowed_card_types = updates.allowedCardTypes

    const { data, error } = await this.supabase
      .from('boards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update board: ${error.message}`)
    }

    return (await this.getBoard(id))!
  }

  async deleteBoard(id: string): Promise<void> {
    const userId = await this.ensureAuth()

    const { error } = await this.supabase
      .from('boards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete board: ${error.message}`)
    }
  }

  // Lists
  async getLists(boardId: string): Promise<List[]> {
    const userId = await this.ensureAuth()

    const { data: listsData, error: listsError } = await this.supabase
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (listsError) {
      throw new Error(`Failed to fetch lists: ${listsError.message}`)
    }

    const listIds = listsData.map((l: any) => l.id)

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .in('list_id', listIds)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    return listsData.map((list: any) => {
      const cards = cardsData
        .filter((card: any) => card.list_id === list.id)
        .map((card: any) => toCamelCase<Card>(card))

      return toCamelCase<List>({ ...list, cards })
    })
  }

  async getList(id: string): Promise<List | null> {
    const userId = await this.ensureAuth()

    const { data: listData, error: listError } = await this.supabase
      .from('lists')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (listError) {
      if (listError.code === 'PGRST116') return null
      throw new Error(`Failed to fetch list: ${listError.message}`)
    }

    const { data: cardsData, error: cardsError } = await this.supabase
      .from('cards')
      .select('*')
      .eq('list_id', id)
      .order('position', { ascending: true })

    if (cardsError) {
      throw new Error(`Failed to fetch cards: ${cardsError.message}`)
    }

    const cards = cardsData.map((card: any) => toCamelCase<Card>(card))

    return toCamelCase<List>({ ...listData, cards })
  }

  async createList(boardId: string, data: Partial<List>): Promise<List> {
    const userId = await this.ensureAuth()

    const { data: listData, error } = await this.supabase
      .from('lists')
      .insert({
        board_id: boardId,
        user_id: userId,
        name: data.name || 'New List',
        position: data.position ?? 0,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create list: ${error.message}`)
    }

    return toCamelCase<List>({ ...listData, cards: [] })
  }

  async updateList(id: string, updates: Partial<List>): Promise<List> {
    const userId = await this.ensureAuth()

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.position !== undefined) updateData.position = updates.position

    const { data, error } = await this.supabase
      .from('lists')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update list: ${error.message}`)
    }

    return (await this.getList(id))!
  }

  async deleteList(id: string): Promise<void> {
    const userId = await this.ensureAuth()

    const { error } = await this.supabase
      .from('lists')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete list: ${error.message}`)
    }
  }

  async reorderLists(boardId: string, listIds: string[]): Promise<void> {
    const userId = await this.ensureAuth()

    // Update positions for all lists
    const updates = listIds.map((listId, index) => ({
      id: listId,
      position: index,
    }))

    for (const update of updates) {
      const { error } = await this.supabase
        .from('lists')
        .update({ position: update.position })
        .eq('id', update.id)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to reorder lists: ${error.message}`)
      }
    }
  }

  // Cards
  async getCards(listId: string): Promise<Card[]> {
    const userId = await this.ensureAuth()

    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch cards: ${error.message}`)
    }

    return data.map((card: any) => toCamelCase<Card>(card))
  }

  async getCard(id: string): Promise<Card | null> {
    const userId = await this.ensureAuth()

    const { data, error } = await this.supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch card: ${error.message}`)
    }

    return toCamelCase<Card>(data)
  }

  async createCard(listId: string, data: Partial<Card>): Promise<Card> {
    const userId = await this.ensureAuth()

    const { data: cardData, error } = await this.supabase
      .from('cards')
      .insert({
        list_id: listId,
        user_id: userId,
        title: data.title || 'New Card',
        description: data.description || null,
        position: data.position ?? 0,
        type: data.type || null,
        prompt: data.prompt || null,
        rating: data.rating || null,
        ai_tool: data.aiTool || null,
        responsible: data.responsible || null,
        job_number: data.jobNumber || null,
        severity: data.severity || null,
        priority: data.priority || null,
        effort: data.effort || null,
        attendees: data.attendees || null,
        meeting_date: data.meetingDate || null,
        tags: data.tags || null,
        links: data.links || null,
        due_date: data.dueDate || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create card: ${error.message}`)
    }

    return toCamelCase<Card>(cardData)
  }

  async updateCard(id: string, updates: Partial<Card>): Promise<Card> {
    const userId = await this.ensureAuth()

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.position !== undefined) updateData.position = updates.position
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.prompt !== undefined) updateData.prompt = updates.prompt
    if (updates.rating !== undefined) updateData.rating = updates.rating
    if (updates.aiTool !== undefined) updateData.ai_tool = updates.aiTool
    if (updates.responsible !== undefined) updateData.responsible = updates.responsible
    if (updates.jobNumber !== undefined) updateData.job_number = updates.jobNumber
    if (updates.severity !== undefined) updateData.severity = updates.severity
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.effort !== undefined) updateData.effort = updates.effort
    if (updates.attendees !== undefined) updateData.attendees = updates.attendees
    if (updates.meetingDate !== undefined) updateData.meeting_date = updates.meetingDate
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.links !== undefined) updateData.links = updates.links
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate

    const { data, error } = await this.supabase
      .from('cards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update card: ${error.message}`)
    }

    return toCamelCase<Card>(data)
  }

  async deleteCard(id: string): Promise<void> {
    const userId = await this.ensureAuth()

    const { error } = await this.supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete card: ${error.message}`)
    }
  }

  async moveCard(cardId: string, targetListId: string, position: number): Promise<void> {
    const userId = await this.ensureAuth()

    const { error } = await this.supabase
      .from('cards')
      .update({
        list_id: targetListId,
        position: position,
      })
      .eq('id', cardId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to move card: ${error.message}`)
    }

    // Reorder other cards in the target list
    const { data: cards } = await this.supabase
      .from('cards')
      .select('id')
      .eq('list_id', targetListId)
      .order('position', { ascending: true })

    if (cards) {
      const cardIds = cards.map((c: any) => c.id)
      await this.reorderCards(targetListId, cardIds)
    }
  }

  async reorderCards(listId: string, cardIds: string[]): Promise<void> {
    const userId = await this.ensureAuth()

    // Update positions for all cards
    const updates = cardIds.map((cardId, index) => ({
      id: cardId,
      position: index,
    }))

    for (const update of updates) {
      const { error } = await this.supabase
        .from('cards')
        .update({ position: update.position })
        .eq('id', update.id)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to reorder cards: ${error.message}`)
      }
    }
  }

  // Bulk operations
  async getAllData(): Promise<{ workspaces: Workspace[] }> {
    const workspaces = await this.getWorkspaces()
    return { workspaces }
  }

  async importData(data: { workspaces: Workspace[] }): Promise<void> {
    // This will be implemented in the migration module
    throw new Error('Import not yet implemented for Supabase adapter. Use migration tools.')
  }

  async clearAllData(): Promise<void> {
    const userId = await this.ensureAuth()

    // Delete in reverse order (cards -> lists -> boards -> workspaces) due to foreign keys
    await this.supabase.from('cards').delete().eq('user_id', userId)
    await this.supabase.from('lists').delete().eq('user_id', userId)
    await this.supabase.from('boards').delete().eq('user_id', userId)
    await this.supabase.from('workspaces').delete().eq('user_id', userId)
  }
}
