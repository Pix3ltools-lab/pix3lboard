import { execute } from './turso';
import { generateId } from '@/lib/utils/id';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'archived'
  | 'restored'
  | 'assigned'
  | 'commented'
  | 'attachment_added'
  | 'attachment_deleted';

export type EntityType = 'card' | 'list' | 'board' | 'comment' | 'attachment';

export interface ActivityLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  userId: string;
  action: ActivityAction;
  details: Record<string, unknown> | null;
  createdAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
}

/**
 * Log an activity event
 */
export async function logActivity(params: {
  entityType: EntityType;
  entityId: string;
  userId: string;
  action: ActivityAction;
  details?: Record<string, unknown>;
}): Promise<void> {
  const id = generateId();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO activity_log (id, entity_type, entity_id, user_id, action, details, created_at)
     VALUES (:id, :entityType, :entityId, :userId, :action, :details, :createdAt)`,
    {
      id,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      action: params.action,
      details: params.details ? JSON.stringify(params.details) : null,
      createdAt: now,
    }
  );
}

/**
 * Log multiple activity events in a batch
 */
export async function logActivities(
  entries: Array<{
    entityType: EntityType;
    entityId: string;
    userId: string;
    action: ActivityAction;
    details?: Record<string, unknown>;
  }>
): Promise<void> {
  for (const entry of entries) {
    await logActivity({ ...entry });
  }
}
