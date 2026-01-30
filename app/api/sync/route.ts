import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { execute, queryOne } from '@/lib/db/turso';
import { SyncPayloadSchema } from '@/lib/validation/schemas';
import type { SyncChange, SyncResult, SyncConflict, Workspace, Board, List, Card } from '@/types';
import type { BoardRole } from '@/types/board';
import { canManageBoard, canManageLists, canEditCards } from '@/lib/auth/permissions';
import { logActivity } from '@/lib/db/activityLog';

export const dynamic = 'force-dynamic';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// Verify user owns the workspace
async function verifyWorkspaceOwnership(userId: string, workspaceId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'SELECT id FROM workspaces WHERE id = :workspaceId AND user_id = :userId',
    { workspaceId, userId }
  );
  return !!result;
}

// Get user's role for a board (owned or shared)
async function getBoardRole(userId: string, boardId: string): Promise<BoardRole | null> {
  // Check if user owns the workspace
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT b.id FROM boards b
     JOIN workspaces w ON w.id = b.workspace_id
     WHERE b.id = :boardId AND w.user_id = :userId`,
    { boardId, userId }
  );
  if (ownerCheck) return 'owner';

  // Check board_shares
  const share = await queryOne<{ role: string }>(
    `SELECT role FROM board_shares
     WHERE board_id = :boardId AND user_id = :userId`,
    { boardId, userId }
  );
  if (share) {
    const validRoles: BoardRole[] = ['owner', 'editor', 'commenter', 'viewer'];
    if (validRoles.includes(share.role as BoardRole)) {
      return share.role as BoardRole;
    }
  }
  return null;
}

// Verify user can modify board (owned or shared with owner role)
async function verifyBoardAccess(userId: string, boardId: string): Promise<boolean> {
  const role = await getBoardRole(userId, boardId);
  return canManageBoard(role);
}

// Verify user can edit cards/lists on board
async function verifyBoardEditAccess(userId: string, boardId: string): Promise<boolean> {
  const role = await getBoardRole(userId, boardId);
  return canEditCards(role);
}

// Verify user can manage lists on board
async function verifyBoardListAccess(userId: string, boardId: string): Promise<boolean> {
  const role = await getBoardRole(userId, boardId);
  return canManageLists(role);
}

// Verify user can modify list (requires manageLists permission)
async function verifyListAccess(userId: string, listId: string): Promise<boolean> {
  const result = await queryOne<{ board_id: string }>(
    'SELECT board_id FROM lists WHERE id = :listId',
    { listId }
  );
  if (!result) return false;
  return verifyBoardListAccess(userId, result.board_id);
}

// Verify user can create/edit cards in a list (requires editCards permission)
async function verifyListEditAccess(userId: string, listId: string): Promise<boolean> {
  const result = await queryOne<{ board_id: string }>(
    'SELECT board_id FROM lists WHERE id = :listId',
    { listId }
  );
  if (!result) return false;
  return verifyBoardEditAccess(userId, result.board_id);
}

// Verify user can modify card (requires editCards permission)
async function verifyCardAccess(userId: string, cardId: string): Promise<boolean> {
  const result = await queryOne<{ board_id: string }>(
    `SELECT l.board_id FROM cards c
     JOIN lists l ON l.id = c.list_id
     WHERE c.id = :cardId`,
    { cardId }
  );
  if (!result) return false;
  return verifyBoardEditAccess(userId, result.board_id);
}

// Get entity for conflict check
interface EntityWithTimestamp {
  name?: string;
  title?: string;
  updated_at: string;
}

async function getEntityForConflictCheck(
  entityType: string,
  entityId: string
): Promise<EntityWithTimestamp | null> {
  switch (entityType) {
    case 'workspace':
      return queryOne<EntityWithTimestamp>(
        'SELECT name, updated_at FROM workspaces WHERE id = :id',
        { id: entityId }
      );
    case 'board':
      return queryOne<EntityWithTimestamp>(
        'SELECT name, updated_at FROM boards WHERE id = :id',
        { id: entityId }
      );
    case 'list':
      return queryOne<EntityWithTimestamp>(
        'SELECT name, updated_at FROM lists WHERE id = :id',
        { id: entityId }
      );
    case 'card':
      return queryOne<EntityWithTimestamp>(
        'SELECT title, updated_at FROM cards WHERE id = :id',
        { id: entityId }
      );
    default:
      return null;
  }
}

// Check for conflict (returns conflict info if detected, null otherwise)
async function checkConflict(
  change: SyncChange
): Promise<SyncConflict | null> {
  // Only check conflicts for update operations with expectedUpdatedAt
  if (change.operation !== 'update' || !change.expectedUpdatedAt) {
    return null;
  }

  const entity = await getEntityForConflictCheck(change.entityType, change.entityId);
  if (!entity) {
    return null; // Entity doesn't exist, will fail on apply
  }

  // Compare timestamps - if server is newer, there's a conflict
  const clientTime = new Date(change.expectedUpdatedAt).getTime();
  const serverTime = new Date(entity.updated_at).getTime();

  if (serverTime > clientTime) {
    return {
      entityType: change.entityType,
      entityId: change.entityId,
      entityName: entity.name || entity.title || 'Unknown',
      clientUpdatedAt: change.expectedUpdatedAt,
      serverUpdatedAt: entity.updated_at,
      serverData: entity,
      pendingChange: change,
    };
  }

  return null;
}

// Apply a single change
async function applyChange(userId: string, change: SyncChange): Promise<void> {
  const { entityType, entityId, operation, data, parentId } = change;

  switch (entityType) {
    case 'workspace':
      await applyWorkspaceChange(userId, entityId, operation, data as Partial<Workspace>);
      break;
    case 'board':
      await applyBoardChange(userId, entityId, operation, data as Partial<Board>, parentId);
      break;
    case 'list':
      await applyListChange(userId, entityId, operation, data as Partial<List>, parentId);
      break;
    case 'card':
      await applyCardChange(userId, entityId, operation, data as Partial<Card>, parentId);
      break;
  }
}

async function applyWorkspaceChange(
  userId: string,
  entityId: string,
  operation: string,
  data?: Partial<Workspace>
): Promise<void> {
  switch (operation) {
    case 'create':
      if (!data) throw new Error('Data required for create');
      await execute(
        `INSERT INTO workspaces (id, user_id, name, description, icon, color, created_at, updated_at)
         VALUES (:id, :userId, :name, :description, :icon, :color, :createdAt, :updatedAt)`,
        {
          id: entityId,
          userId,
          name: data.name || 'Untitled Workspace',
          description: data.description || null,
          icon: data.icon || null,
          color: data.color || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }
      );
      break;

    case 'update':
      if (!data) throw new Error('Data required for update');
      if (!(await verifyWorkspaceOwnership(userId, entityId))) {
        throw new Error('Workspace not found or access denied');
      }
      const updateFields: string[] = [];
      const updateParams: Record<string, unknown> = { id: entityId };

      if (data.name !== undefined) {
        updateFields.push('name = :name');
        updateParams.name = data.name;
      }
      if (data.description !== undefined) {
        updateFields.push('description = :description');
        updateParams.description = data.description || null;
      }
      if (data.icon !== undefined) {
        updateFields.push('icon = :icon');
        updateParams.icon = data.icon || null;
      }
      if (data.color !== undefined) {
        updateFields.push('color = :color');
        updateParams.color = data.color || null;
      }
      updateFields.push('updated_at = :updatedAt');
      updateParams.updatedAt = new Date().toISOString();

      await execute(
        `UPDATE workspaces SET ${updateFields.join(', ')} WHERE id = :id`,
        updateParams
      );
      break;

    case 'delete':
      if (!(await verifyWorkspaceOwnership(userId, entityId))) {
        throw new Error('Workspace not found or access denied');
      }
      // Cascade delete: cards -> lists -> boards -> workspace
      await execute('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE workspace_id = :id)))', { id: entityId });
      await execute('DELETE FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id IN (SELECT id FROM boards WHERE workspace_id = :id))', { id: entityId });
      await execute('DELETE FROM lists WHERE board_id IN (SELECT id FROM boards WHERE workspace_id = :id)', { id: entityId });
      await execute('DELETE FROM board_shares WHERE board_id IN (SELECT id FROM boards WHERE workspace_id = :id)', { id: entityId });
      await execute('DELETE FROM boards WHERE workspace_id = :id', { id: entityId });
      await execute('DELETE FROM workspaces WHERE id = :id', { id: entityId });
      break;
  }
}

async function applyBoardChange(
  userId: string,
  entityId: string,
  operation: string,
  data?: Partial<Board>,
  parentId?: string
): Promise<void> {
  switch (operation) {
    case 'create':
      if (!data || !parentId) throw new Error('Data and parentId required for create');
      if (!(await verifyWorkspaceOwnership(userId, parentId))) {
        throw new Error('Workspace not found or access denied');
      }
      await execute(
        `INSERT INTO boards (id, workspace_id, name, description, background, allowed_card_types, is_public, created_at, updated_at)
         VALUES (:id, :workspaceId, :name, :description, :background, :allowedCardTypes, :isPublic, :createdAt, :updatedAt)`,
        {
          id: entityId,
          workspaceId: parentId,
          name: data.name || 'Untitled Board',
          description: data.description || null,
          background: data.background || null,
          allowedCardTypes: data.allowedCardTypes ? JSON.stringify(data.allowedCardTypes) : null,
          isPublic: data.isPublic ? 1 : 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }
      );
      break;

    case 'update':
      if (!data) throw new Error('Data required for update');
      if (!(await verifyBoardAccess(userId, entityId))) {
        throw new Error('Board not found or access denied');
      }
      const updateFields: string[] = [];
      const updateParams: Record<string, unknown> = { id: entityId };

      if (data.workspaceId !== undefined) {
        // Verify user owns the target workspace
        if (!(await verifyWorkspaceOwnership(userId, data.workspaceId))) {
          throw new Error('Target workspace not found or access denied');
        }
        updateFields.push('workspace_id = :workspaceId');
        updateParams.workspaceId = data.workspaceId;
      }
      if (data.name !== undefined) {
        updateFields.push('name = :name');
        updateParams.name = data.name;
      }
      if (data.description !== undefined) {
        updateFields.push('description = :description');
        updateParams.description = data.description || null;
      }
      if (data.background !== undefined) {
        updateFields.push('background = :background');
        updateParams.background = data.background || null;
      }
      if (data.allowedCardTypes !== undefined) {
        updateFields.push('allowed_card_types = :allowedCardTypes');
        updateParams.allowedCardTypes = data.allowedCardTypes ? JSON.stringify(data.allowedCardTypes) : null;
      }
      if (data.isPublic !== undefined) {
        updateFields.push('is_public = :isPublic');
        updateParams.isPublic = data.isPublic ? 1 : 0;
      }
      updateFields.push('updated_at = :updatedAt');
      updateParams.updatedAt = new Date().toISOString();

      await execute(
        `UPDATE boards SET ${updateFields.join(', ')} WHERE id = :id`,
        updateParams
      );
      break;

    case 'delete':
      if (!(await verifyBoardAccess(userId, entityId))) {
        throw new Error('Board not found or access denied');
      }
      await execute('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = :id))', { id: entityId });
      await execute('DELETE FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = :id)', { id: entityId });
      await execute('DELETE FROM lists WHERE board_id = :id', { id: entityId });
      await execute('DELETE FROM board_shares WHERE board_id = :id', { id: entityId });
      await execute('DELETE FROM boards WHERE id = :id', { id: entityId });
      break;
  }
}

async function applyListChange(
  userId: string,
  entityId: string,
  operation: string,
  data?: Partial<List>,
  parentId?: string
): Promise<void> {
  switch (operation) {
    case 'create':
      if (!data || !parentId) throw new Error('Data and parentId required for create');
      if (!(await verifyBoardListAccess(userId, parentId))) {
        throw new Error('Board not found or access denied');
      }
      await execute(
        `INSERT INTO lists (id, board_id, name, position, color, created_at, updated_at)
         VALUES (:id, :boardId, :name, :position, :color, :createdAt, :updatedAt)`,
        {
          id: entityId,
          boardId: parentId,
          name: data.name || 'Untitled List',
          position: data.position ?? 0,
          color: data.color || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }
      );
      break;

    case 'update':
      if (!data) throw new Error('Data required for update');
      if (!(await verifyListAccess(userId, entityId))) {
        throw new Error('List not found or access denied');
      }
      const updateFields: string[] = [];
      const updateParams: Record<string, unknown> = { id: entityId };

      if (data.name !== undefined) {
        updateFields.push('name = :name');
        updateParams.name = data.name;
      }
      if (data.position !== undefined) {
        updateFields.push('position = :position');
        updateParams.position = data.position;
      }
      if (data.color !== undefined) {
        updateFields.push('color = :color');
        updateParams.color = data.color || null;
      }
      updateFields.push('updated_at = :updatedAt');
      updateParams.updatedAt = new Date().toISOString();

      await execute(
        `UPDATE lists SET ${updateFields.join(', ')} WHERE id = :id`,
        updateParams
      );
      break;

    case 'delete':
      if (!(await verifyListAccess(userId, entityId))) {
        throw new Error('List not found or access denied');
      }
      await execute('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE list_id = :id)', { id: entityId });
      await execute('DELETE FROM cards WHERE list_id = :id', { id: entityId });
      await execute('DELETE FROM lists WHERE id = :id', { id: entityId });
      break;
  }
}

async function applyCardChange(
  userId: string,
  entityId: string,
  operation: string,
  data?: Partial<Card>,
  parentId?: string
): Promise<void> {
  switch (operation) {
    case 'create':
      if (!data || !parentId) throw new Error('Data and parentId required for create');
      if (!(await verifyListEditAccess(userId, parentId))) {
        throw new Error('List not found or access denied');
      }
      await execute(
        `INSERT INTO cards (id, list_id, title, description, position, type, prompt, rating, ai_tool, tags, due_date, links, responsible, responsible_user_id, job_number, severity, priority, effort, attendees, meeting_date, checklist, is_archived, thumbnail, created_at, updated_at)
         VALUES (:id, :listId, :title, :description, :position, :type, :prompt, :rating, :aiTool, :tags, :dueDate, :links, :responsible, :responsibleUserId, :jobNumber, :severity, :priority, :effort, :attendees, :meetingDate, :checklist, :isArchived, :thumbnail, :createdAt, :updatedAt)`,
        {
          id: entityId,
          listId: parentId,
          title: data.title || 'Untitled Card',
          description: data.description || null,
          position: data.position ?? 0,
          type: data.type || null,
          prompt: data.prompt || null,
          rating: data.rating || null,
          aiTool: data.aiTool || null,
          tags: data.tags ? JSON.stringify(data.tags) : null,
          dueDate: data.dueDate || null,
          links: data.links ? JSON.stringify(data.links) : null,
          responsible: data.responsible || null,
          responsibleUserId: data.responsibleUserId || null,
          jobNumber: data.jobNumber || null,
          severity: data.severity || null,
          priority: data.priority || null,
          effort: data.effort || null,
          attendees: data.attendees ? JSON.stringify(data.attendees) : null,
          meetingDate: data.meetingDate || null,
          checklist: data.checklist ? JSON.stringify(data.checklist) : null,
          isArchived: data.isArchived ? 1 : 0,
          thumbnail: data.thumbnail || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }
      );
      break;

    case 'update':
      if (!data) throw new Error('Data required for update');
      if (!(await verifyCardAccess(userId, entityId))) {
        throw new Error('Card not found or access denied');
      }
      const updateFields: string[] = [];
      const updateParams: Record<string, unknown> = { id: entityId };

      // Handle listId change (move card)
      if (data.listId !== undefined) {
        if (!(await verifyListEditAccess(userId, data.listId))) {
          throw new Error('Target list not found or access denied');
        }
        updateFields.push('list_id = :listId');
        updateParams.listId = data.listId;
      }

      if (data.title !== undefined) {
        updateFields.push('title = :title');
        updateParams.title = data.title;
      }
      if (data.description !== undefined) {
        updateFields.push('description = :description');
        updateParams.description = data.description || null;
      }
      if (data.position !== undefined) {
        updateFields.push('position = :position');
        updateParams.position = data.position;
      }
      if (data.type !== undefined) {
        updateFields.push('type = :type');
        updateParams.type = data.type || null;
      }
      if (data.prompt !== undefined) {
        updateFields.push('prompt = :prompt');
        updateParams.prompt = data.prompt || null;
      }
      if (data.rating !== undefined) {
        updateFields.push('rating = :rating');
        updateParams.rating = data.rating || null;
      }
      if (data.aiTool !== undefined) {
        updateFields.push('ai_tool = :aiTool');
        updateParams.aiTool = data.aiTool || null;
      }
      if (data.tags !== undefined) {
        updateFields.push('tags = :tags');
        updateParams.tags = data.tags ? JSON.stringify(data.tags) : null;
      }
      if (data.dueDate !== undefined) {
        updateFields.push('due_date = :dueDate');
        updateParams.dueDate = data.dueDate || null;
      }
      if (data.links !== undefined) {
        updateFields.push('links = :links');
        updateParams.links = data.links ? JSON.stringify(data.links) : null;
      }
      if (data.responsible !== undefined) {
        updateFields.push('responsible = :responsible');
        updateParams.responsible = data.responsible || null;
      }
      if (data.responsibleUserId !== undefined) {
        updateFields.push('responsible_user_id = :responsibleUserId');
        updateParams.responsibleUserId = data.responsibleUserId || null;
      }
      if (data.jobNumber !== undefined) {
        updateFields.push('job_number = :jobNumber');
        updateParams.jobNumber = data.jobNumber || null;
      }
      if (data.severity !== undefined) {
        updateFields.push('severity = :severity');
        updateParams.severity = data.severity || null;
      }
      if (data.priority !== undefined) {
        updateFields.push('priority = :priority');
        updateParams.priority = data.priority || null;
      }
      if (data.effort !== undefined) {
        updateFields.push('effort = :effort');
        updateParams.effort = data.effort || null;
      }
      if (data.attendees !== undefined) {
        updateFields.push('attendees = :attendees');
        updateParams.attendees = data.attendees ? JSON.stringify(data.attendees) : null;
      }
      if (data.meetingDate !== undefined) {
        updateFields.push('meeting_date = :meetingDate');
        updateParams.meetingDate = data.meetingDate || null;
      }
      if (data.checklist !== undefined) {
        updateFields.push('checklist = :checklist');
        updateParams.checklist = data.checklist ? JSON.stringify(data.checklist) : null;
      }
      if (data.isArchived !== undefined) {
        updateFields.push('is_archived = :isArchived');
        updateParams.isArchived = data.isArchived ? 1 : 0;
      }
      if (data.thumbnail !== undefined) {
        updateFields.push('thumbnail = :thumbnail');
        updateParams.thumbnail = data.thumbnail || null;
      }
      updateFields.push('updated_at = :updatedAt');
      updateParams.updatedAt = new Date().toISOString();

      await execute(
        `UPDATE cards SET ${updateFields.join(', ')} WHERE id = :id`,
        updateParams
      );
      break;

    case 'delete':
      if (!(await verifyCardAccess(userId, entityId))) {
        throw new Error('Card not found or access denied');
      }
      await execute('DELETE FROM comments WHERE card_id = :id', { id: entityId });
      await execute('DELETE FROM cards WHERE id = :id', { id: entityId });
      break;
  }
}

// PATCH /api/sync - Apply incremental changes
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = SyncPayloadSchema.safeParse(body);

    if (!validation.success) {
      console.error('Sync validation error:', validation.error.issues);
      return NextResponse.json(
        { error: 'Invalid sync payload', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { changes } = validation.data;
    const failedChanges: Array<{ change: SyncChange; error: string }> = [];
    const conflicts: SyncConflict[] = [];
    let appliedCount = 0;

    // Apply changes in order (sorted by timestamp to ensure correct order)
    const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);

    for (const change of sortedChanges) {
      try {
        // Check for conflicts before applying
        const conflict = await checkConflict(change);
        if (conflict) {
          conflicts.push(conflict);
          continue; // Skip this change, let client handle conflict
        }

        await applyChange(userId, change);
        appliedCount++;

        // Log activity for card and list operations
        if (change.entityType === 'card' || change.entityType === 'list') {
          const actionMap: Record<string, string> = {
            create: 'created',
            update: 'updated',
            delete: 'deleted',
          };
          const action = actionMap[change.operation] || change.operation;

          // Build details based on operation
          const details: Record<string, unknown> = {};
          if (change.operation === 'update' && change.data) {
            details.fields = Object.keys(change.data);
            // Track move operations
            if (change.entityType === 'card' && change.data.listId) {
              details.movedToList = change.data.listId;
            }
          }

          try {
            await logActivity({
              entityType: change.entityType,
              entityId: change.entityId,
              userId,
              action: action as 'created' | 'updated' | 'deleted',
              details: Object.keys(details).length > 0 ? details : undefined,
            });
          } catch (logError) {
            // Don't fail the sync if logging fails
            console.error('Failed to log activity:', logError);
          }
        }
      } catch (error) {
        console.error('Failed to apply change:', change, error);
        failedChanges.push({
          change,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const result: SyncResult = {
      success: failedChanges.length === 0 && conflicts.length === 0,
      appliedCount,
      failedChanges: failedChanges.length > 0 ? failedChanges : undefined,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      serverVersion: Date.now(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync changes' }, { status: 500 });
  }
}
