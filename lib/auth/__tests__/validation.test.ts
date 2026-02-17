import { describe, test, expect } from 'vitest';
import { validateEmail, validatePassword, sanitizeInput } from '../validation';

// --- validateEmail ---

describe('validateEmail', () => {
  test('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  test('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toEqual({ valid: true });
  });

  test('trims and lowercases before validating', () => {
    const result = validateEmail('  User@Example.COM  ');
    expect(result.valid).toBe(true);
  });

  test('rejects empty string', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' });
  });

  test('rejects null/undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateEmail(null as any).valid).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validateEmail(undefined as any).valid).toBe(false);
  });

  test('rejects email without @', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
  });

  test('rejects email without domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  test('rejects email with spaces', () => {
    expect(validateEmail('user @example.com').valid).toBe(false);
  });

  test('rejects email exceeding 254 chars', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Email is too long');
  });
});

// --- validatePassword ---

describe('validatePassword', () => {
  test('accepts valid password', () => {
    expect(validatePassword('MyPass123')).toEqual({ valid: true });
  });

  test('rejects empty string', () => {
    expect(validatePassword('')).toEqual({ valid: false, error: 'Password is required' });
  });

  test('rejects null/undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validatePassword(null as any).valid).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validatePassword(undefined as any).valid).toBe(false);
  });

  test('rejects password shorter than 8 chars', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters');
  });

  test('rejects password exceeding 128 chars', () => {
    const result = validatePassword('Aa1' + 'x'.repeat(126));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password is too long');
  });

  test('rejects password without lowercase', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must contain at least one lowercase letter');
  });

  test('rejects password without uppercase', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must contain at least one uppercase letter');
  });

  test('rejects password without number', () => {
    const result = validatePassword('NoNumbersHere');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must contain at least one number');
  });

  test('accepts password with exactly 8 chars', () => {
    expect(validatePassword('Abcdef1x').valid).toBe(true);
  });

  test('accepts password with exactly 128 chars', () => {
    const pw = 'Aa1' + 'x'.repeat(125);
    expect(pw.length).toBe(128);
    expect(validatePassword(pw).valid).toBe(true);
  });
});

// --- sanitizeInput ---

describe('sanitizeInput', () => {
  test('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  test('truncates to 1000 characters', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeInput(long)).toHaveLength(1000);
  });

  test('returns empty string for non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeInput(123 as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeInput(null as any)).toBe('');
  });

  test('returns input unchanged when short and trimmed', () => {
    expect(sanitizeInput('test@example.com')).toBe('test@example.com');
  });

  test('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
