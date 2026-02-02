/**
 * Notification helper functions
 */

import { nanoid } from 'nanoid';
import { execute, queryOne } from './turso';
import type { NotificationType } from '@/types';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<string> {
  const { userId, type, title, message, link } = params;
  const id = nanoid();
  const now = new Date().toISOString();

  await execute(`
    INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
    VALUES (:id, :userId, :type, :title, :message, :link, 0, :createdAt)
  `, {
    id,
    userId,
    type,
    title,
    message: message || null,
    link: link || null,
    createdAt: now,
  });

  return id;
}

/**
 * Create notification when user is assigned as responsible
 */
export async function notifyAssignment(params: {
  assignedUserId: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  assignerName: string;
}): Promise<void> {
  const { assignedUserId, cardId, cardTitle, boardId, assignerName } = params;

  await createNotification({
    userId: assignedUserId,
    type: 'assignment',
    title: `${assignerName} ti ha assegnato a una card`,
    message: cardTitle,
    link: `/workspace/__current__/board/${boardId}?card=${cardId}`,
  });
}

/**
 * Create notification when comment is added on card where user is responsible
 */
export async function notifyComment(params: {
  responsibleUserId: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  commenterName: string;
  commentSnippet: string;
}): Promise<void> {
  const { responsibleUserId, cardId, cardTitle, boardId, commenterName, commentSnippet } = params;

  // Don't notify if commenter is the responsible user
  await createNotification({
    userId: responsibleUserId,
    type: 'comment',
    title: `${commenterName} ha commentato`,
    message: `"${commentSnippet.substring(0, 100)}${commentSnippet.length > 100 ? '...' : ''}" su ${cardTitle}`,
    link: `/workspace/__current__/board/${boardId}?card=${cardId}`,
  });
}

/**
 * Create notification for due date reminder
 */
export async function notifyDueDate(params: {
  userId: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  dueDate: string;
  isPassed: boolean;
}): Promise<void> {
  const { userId, cardId, cardTitle, boardId, dueDate, isPassed } = params;

  await createNotification({
    userId,
    type: isPassed ? 'due_date_passed' : 'due_date',
    title: isPassed ? 'Card scaduta' : 'Card in scadenza',
    message: `"${cardTitle}" ${isPassed ? 'era in scadenza il' : 'scade il'} ${new Date(dueDate).toLocaleDateString('it-IT')}`,
    link: `/workspace/__current__/board/${boardId}?card=${cardId}`,
  });
}

/**
 * Create notification for @mention in comment
 */
export async function notifyMention(params: {
  mentionedUserId: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  mentionerName: string;
  commentSnippet: string;
}): Promise<void> {
  const { mentionedUserId, cardId, cardTitle, boardId, mentionerName, commentSnippet } = params;

  await createNotification({
    userId: mentionedUserId,
    type: 'mention',
    title: `${mentionerName} ti ha menzionato`,
    message: `"${commentSnippet.substring(0, 100)}${commentSnippet.length > 100 ? '...' : ''}" in ${cardTitle}`,
    link: `/workspace/__current__/board/${boardId}?card=${cardId}`,
  });
}

interface CardWithResponsible {
  responsible_user_id: string | null;
  title: string;
  board_id: string;
}

/**
 * Get card info for notification context
 */
export async function getCardForNotification(cardId: string): Promise<CardWithResponsible | null> {
  return await queryOne<CardWithResponsible>(`
    SELECT c.responsible_user_id, c.title, l.board_id
    FROM cards c
    JOIN lists l ON l.id = c.list_id
    WHERE c.id = :cardId
  `, { cardId });
}
