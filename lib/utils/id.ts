import { nanoid } from 'nanoid';

/**
 * Generate a unique ID using nanoid
 */
export function generateId(): string {
  return nanoid();
}
