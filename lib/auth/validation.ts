// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting storage (in-memory, resets on server restart)
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

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

export function checkRateLimit(identifier: string): { allowed: boolean; error?: string; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  // Clean up old entries periodically
  if (loginAttempts.size > 10000) {
    for (const [key, value] of loginAttempts.entries()) {
      if (now - value.lastAttempt > ATTEMPT_WINDOW) {
        loginAttempts.delete(key);
      }
    }
  }

  if (!record) {
    return { allowed: true };
  }

  // Check if currently locked out
  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      error: `Too many failed attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes`,
      retryAfter,
    };
  }

  // Reset if window has passed
  if (now - record.lastAttempt > ATTEMPT_WINDOW) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now, lockedUntil: 0 });
    return;
  }

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION;
  }
}

export function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}
