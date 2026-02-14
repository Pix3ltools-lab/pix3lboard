/**
 * Notification helper functions
 */

import { nanoid } from 'nanoid';
import { execute, queryOne, query } from './turso';
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
    title: `${assignerName} assigned you to a card`,
    message: cardTitle,
    link: `/board/${boardId}?card=${cardId}`,
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
    title: `${commenterName} commented`,
    message: `"${commentSnippet.substring(0, 100)}${commentSnippet.length > 100 ? '...' : ''}" on ${cardTitle}`,
    link: `/board/${boardId}?card=${cardId}`,
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
    title: isPassed ? 'Card overdue' : 'Card due soon',
    message: `"${cardTitle}" ${isPassed ? 'was due on' : 'is due on'} ${new Date(dueDate).toLocaleDateString('en-US')}`,
    link: `/board/${boardId}?card=${cardId}`,
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
    title: `${mentionerName} mentioned you`,
    message: `"${commentSnippet.substring(0, 100)}${commentSnippet.length > 100 ? '...' : ''}" in ${cardTitle}`,
    link: `/board/${boardId}?card=${cardId}`,
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

interface CardDueDate {
  id: string;
  title: string;
  due_date: string;
  board_id: string;
}

/**
 * Check for cards with approaching or passed due dates and create notifications
 * Called during notification fetch to avoid needing a separate cron job
 */
export async function checkDueDates(userId: string): Promise<number> {
  // Get today and tomorrow dates (date only, no time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Find cards where user is responsible with due_date today or tomorrow (or past)
  // Only non-archived cards
  const cardsWithDueDate = await query<CardDueDate>(`
    SELECT c.id, c.title, c.due_date, l.board_id
    FROM cards c
    JOIN lists l ON l.id = c.list_id
    WHERE c.responsible_user_id = :userId
      AND c.due_date IS NOT NULL
      AND c.due_date != ''
      AND (c.is_archived = 0 OR c.is_archived IS NULL)
      AND date(c.due_date) <= date(:tomorrow)
  `, { userId, tomorrow: tomorrowStr });

  let notificationsCreated = 0;

  for (const card of cardsWithDueDate) {
    const cardDueDate = card.due_date.split('T')[0];
    const isPassed = cardDueDate < todayStr;
    const isToday = cardDueDate === todayStr;
    const isTomorrow = cardDueDate === tomorrowStr;

    // Determine notification type
    const notifType = isPassed ? 'due_date_passed' : 'due_date';

    // Check if we already sent this notification recently (within 24h)
    const existingNotif = await queryOne<{ id: string }>(`
      SELECT id FROM notifications
      WHERE user_id = :userId
        AND type = :type
        AND link LIKE :linkPattern
        AND created_at > datetime('now', '-24 hours')
    `, {
      userId,
      type: notifType,
      linkPattern: `%card=${card.id}%`,
    });

    if (existingNotif) {
      continue; // Already notified
    }

    // Only notify for: passed, today, or tomorrow
    if (isPassed || isToday || isTomorrow) {
      await notifyDueDate({
        userId,
        cardId: card.id,
        cardTitle: card.title,
        boardId: card.board_id,
        dueDate: card.due_date,
        isPassed,
      });
      notificationsCreated++;
    }
  }

  return notificationsCreated;
}
