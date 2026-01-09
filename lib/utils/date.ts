import { format, formatDistanceToNow, isToday, isPast, isFuture } from 'date-fns';

/**
 * Format date to readable string (e.g., "Jan 15, 2026")
 */
export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date with time (e.g., "Jan 15, 2026 at 3:45 PM")
 */
export function formatDateTime(date: string | Date): string {
  try {
    return format(new Date(date), 'MMM d, yyyy \'at\' h:mm a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelative(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Check if date is today
 */
export function checkIsToday(date: string | Date): boolean {
  try {
    return isToday(new Date(date));
  } catch {
    return false;
  }
}

/**
 * Check if date is in the past
 */
export function checkIsPast(date: string | Date): boolean {
  try {
    return isPast(new Date(date));
  } catch {
    return false;
  }
}

/**
 * Check if date is in the future
 */
export function checkIsFuture(date: string | Date): boolean {
  try {
    return isFuture(new Date(date));
  } catch {
    return false;
  }
}

/**
 * Check if due date is overdue (past and not today)
 */
export function checkIsOverdue(dueDate: string | Date): boolean {
  try {
    const date = new Date(dueDate);
    return isPast(date) && !isToday(date);
  } catch {
    return false;
  }
}
