import { nanoid } from 'nanoid';
import { queryOne, execute } from '@/lib/db/turso';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms

interface RateLimitRecord {
  id: string;
  identifier: string;
  endpoint: string;
  attempts: number;
  window_start: string;
  locked_until: string | null;
  created_at: string;
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string = 'login'
): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  try {
    const record = await queryOne<RateLimitRecord>(
      'SELECT * FROM rate_limits WHERE identifier = :identifier AND endpoint = :endpoint',
      { identifier, endpoint }
    );

    if (!record) {
      return { allowed: true };
    }

    // Check if currently locked out
    if (record.locked_until) {
      const lockedUntil = new Date(record.locked_until).getTime();
      if (lockedUntil > now) {
        const retryAfter = Math.ceil((lockedUntil - now) / 1000);
        return {
          allowed: false,
          error: `Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes`,
          retryAfter,
        };
      }
    }

    // Reset if window has passed
    const windowStart = new Date(record.window_start).getTime();
    if (now - windowStart > ATTEMPT_WINDOW) {
      await execute(
        'DELETE FROM rate_limits WHERE identifier = :identifier AND endpoint = :endpoint',
        { identifier, endpoint }
      );
      return { allowed: true };
    }

    return { allowed: true };
  } catch (error) {
    // If database error, allow the request (fail-open for availability)
    // but log the error for monitoring
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
}

export async function recordFailedAttempt(
  identifier: string,
  endpoint: string = 'login'
): Promise<void> {
  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  try {
    const record = await queryOne<RateLimitRecord>(
      'SELECT * FROM rate_limits WHERE identifier = :identifier AND endpoint = :endpoint',
      { identifier, endpoint }
    );

    if (!record) {
      // Create new record
      await execute(
        `INSERT INTO rate_limits (id, identifier, endpoint, attempts, window_start, locked_until, created_at)
         VALUES (:id, :identifier, :endpoint, 1, :windowStart, NULL, :createdAt)`,
        {
          id: nanoid(),
          identifier,
          endpoint,
          windowStart: nowISO,
          createdAt: nowISO,
        }
      );
      return;
    }

    // Check if window has expired
    const windowStart = new Date(record.window_start).getTime();
    if (now - windowStart > ATTEMPT_WINDOW) {
      // Reset the window
      await execute(
        `UPDATE rate_limits
         SET attempts = 1, window_start = :windowStart, locked_until = NULL
         WHERE identifier = :identifier AND endpoint = :endpoint`,
        { windowStart: nowISO, identifier, endpoint }
      );
      return;
    }

    // Increment attempts
    const newAttempts = record.attempts + 1;
    const lockedUntil = newAttempts >= MAX_ATTEMPTS
      ? new Date(now + LOCKOUT_DURATION).toISOString()
      : null;

    await execute(
      `UPDATE rate_limits
       SET attempts = :attempts, locked_until = :lockedUntil
       WHERE identifier = :identifier AND endpoint = :endpoint`,
      { attempts: newAttempts, lockedUntil, identifier, endpoint }
    );
  } catch (error) {
    // Log error but don't fail the request
    console.error('Record failed attempt error:', error);
  }
}

export async function clearFailedAttempts(
  identifier: string,
  endpoint: string = 'login'
): Promise<void> {
  try {
    await execute(
      'DELETE FROM rate_limits WHERE identifier = :identifier AND endpoint = :endpoint',
      { identifier, endpoint }
    );
  } catch (error) {
    console.error('Clear failed attempts error:', error);
  }
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}
