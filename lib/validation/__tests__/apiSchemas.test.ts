import { describe, test, expect } from 'vitest';
import {
  TokenRequestSchema,
  CreateBoardSchema,
  UpdateBoardSchema,
  CreateListSchema,
  UpdateListSchema,
  CreateCardSchema,
  UpdateCardSchema,
  MoveCardSchema,
} from '../apiSchemas';

// --- TokenRequestSchema ---

describe('TokenRequestSchema', () => {
  test('accepts valid credentials', () => {
    const result = TokenRequestSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  test('rejects invalid email', () => {
    const result = TokenRequestSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
  });

  test('rejects missing password', () => {
    const result = TokenRequestSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });

  test('rejects empty password', () => {
    const result = TokenRequestSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  test('rejects email exceeding 254 chars', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    const result = TokenRequestSchema.safeParse({ email: longEmail, password: 'secret' });
    expect(result.success).toBe(false);
  });

  test('rejects password exceeding 128 chars', () => {
    const result = TokenRequestSchema.safeParse({ email: 'u@b.com', password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });
});

// --- CreateBoardSchema ---

describe('CreateBoardSchema', () => {
  test('accepts valid board with all fields', () => {
    const result = CreateBoardSchema.safeParse({
      workspace_id: 'ws-1',
      name: 'My Board',
      description: 'A board',
      background: '#ff0000',
      allowed_card_types: ['task', 'bug'],
      is_public: false,
    });
    expect(result.success).toBe(true);
  });

  test('accepts minimal input (workspace_id + name)', () => {
    const result = CreateBoardSchema.safeParse({ workspace_id: 'ws-1', name: 'Board' });
    expect(result.success).toBe(true);
  });

  test('rejects missing name', () => {
    const result = CreateBoardSchema.safeParse({ workspace_id: 'ws-1' });
    expect(result.success).toBe(false);
  });

  test('rejects empty name', () => {
    const result = CreateBoardSchema.safeParse({ workspace_id: 'ws-1', name: '' });
    expect(result.success).toBe(false);
  });

  test('rejects name exceeding 200 chars', () => {
    const result = CreateBoardSchema.safeParse({ workspace_id: 'ws-1', name: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  test('rejects too many allowed_card_types', () => {
    const types = Array.from({ length: 21 }, (_, i) => `type${i}`);
    const result = CreateBoardSchema.safeParse({ workspace_id: 'ws-1', name: 'B', allowed_card_types: types });
    expect(result.success).toBe(false);
  });
});

// --- UpdateBoardSchema ---

describe('UpdateBoardSchema', () => {
  test('accepts partial update (name only)', () => {
    const result = UpdateBoardSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  test('accepts empty object (no fields to update)', () => {
    const result = UpdateBoardSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('accepts null description (clear field)', () => {
    const result = UpdateBoardSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  test('accepts null allowed_card_types (clear field)', () => {
    const result = UpdateBoardSchema.safeParse({ allowed_card_types: null });
    expect(result.success).toBe(true);
  });

  test('rejects empty name', () => {
    const result = UpdateBoardSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

// --- CreateListSchema ---

describe('CreateListSchema', () => {
  test('accepts valid list', () => {
    const result = CreateListSchema.safeParse({ name: 'To Do', position: 0, color: 'blue' });
    expect(result.success).toBe(true);
  });

  test('accepts minimal input (name only)', () => {
    const result = CreateListSchema.safeParse({ name: 'To Do' });
    expect(result.success).toBe(true);
  });

  test('rejects empty name', () => {
    const result = CreateListSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  test('rejects negative position', () => {
    const result = CreateListSchema.safeParse({ name: 'List', position: -1 });
    expect(result.success).toBe(false);
  });

  test('rejects non-integer position', () => {
    const result = CreateListSchema.safeParse({ name: 'List', position: 1.5 });
    expect(result.success).toBe(false);
  });
});

// --- UpdateListSchema ---

describe('UpdateListSchema', () => {
  test('accepts partial update', () => {
    const result = UpdateListSchema.safeParse({ name: 'Done' });
    expect(result.success).toBe(true);
  });

  test('accepts null color (clear field)', () => {
    const result = UpdateListSchema.safeParse({ color: null });
    expect(result.success).toBe(true);
  });

  test('accepts empty object', () => {
    const result = UpdateListSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// --- CreateCardSchema ---

describe('CreateCardSchema', () => {
  test('accepts valid card with all fields', () => {
    const result = CreateCardSchema.safeParse({
      list_id: 'list-1',
      title: 'My Card',
      description: 'Details',
      type: 'task',
      rating: 3,
      tags: ['ui', 'frontend'],
      links: ['https://example.com'],
      due_date: '2026-03-01',
      responsible: 'Alice',
      checklist: [{ id: 'c1', text: 'Step 1', checked: false }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts minimal input (list_id + title)', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'list-1', title: 'Card' });
    expect(result.success).toBe(true);
  });

  test('rejects missing title', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'list-1' });
    expect(result.success).toBe(false);
  });

  test('rejects empty title', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'list-1', title: '' });
    expect(result.success).toBe(false);
  });

  test('rejects title exceeding 500 chars', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  test('rejects rating below 1', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', rating: 0 });
    expect(result.success).toBe(false);
  });

  test('rejects rating above 5', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', rating: 6 });
    expect(result.success).toBe(false);
  });

  test('rejects non-integer rating', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', rating: 3.5 });
    expect(result.success).toBe(false);
  });

  test('rejects invalid URL in links', () => {
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', links: ['not-a-url'] });
    expect(result.success).toBe(false);
  });

  test('rejects too many links (>20)', () => {
    const links = Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`);
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', links });
    expect(result.success).toBe(false);
  });

  test('rejects too many tags (>20)', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', tags });
    expect(result.success).toBe(false);
  });

  test('rejects too many checklist items (>100)', () => {
    const checklist = Array.from({ length: 101 }, (_, i) => ({ id: `c${i}`, text: `Item ${i}`, checked: false }));
    const result = CreateCardSchema.safeParse({ list_id: 'l', title: 'C', checklist });
    expect(result.success).toBe(false);
  });

  test('rejects checklist item missing checked field', () => {
    const result = CreateCardSchema.safeParse({
      list_id: 'l', title: 'C',
      checklist: [{ id: 'c1', text: 'Step 1' }],
    });
    expect(result.success).toBe(false);
  });
});

// --- UpdateCardSchema ---

describe('UpdateCardSchema', () => {
  test('accepts partial update (title only)', () => {
    const result = UpdateCardSchema.safeParse({ title: 'Updated' });
    expect(result.success).toBe(true);
  });

  test('accepts empty object', () => {
    const result = UpdateCardSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('accepts null for clearable fields', () => {
    const result = UpdateCardSchema.safeParse({
      description: null,
      type: null,
      rating: null,
      tags: null,
      links: null,
      checklist: null,
    });
    expect(result.success).toBe(true);
  });

  test('rejects empty title', () => {
    const result = UpdateCardSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  test('validates rating range on update', () => {
    expect(UpdateCardSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(UpdateCardSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(UpdateCardSchema.safeParse({ rating: 3 }).success).toBe(true);
    expect(UpdateCardSchema.safeParse({ rating: null }).success).toBe(true);
  });
});

// --- MoveCardSchema ---

describe('MoveCardSchema', () => {
  test('accepts valid move', () => {
    const result = MoveCardSchema.safeParse({ list_id: 'list-2', position: 0 });
    expect(result.success).toBe(true);
  });

  test('rejects missing list_id', () => {
    const result = MoveCardSchema.safeParse({ position: 0 });
    expect(result.success).toBe(false);
  });

  test('rejects missing position', () => {
    const result = MoveCardSchema.safeParse({ list_id: 'list-2' });
    expect(result.success).toBe(false);
  });

  test('rejects negative position', () => {
    const result = MoveCardSchema.safeParse({ list_id: 'list-2', position: -1 });
    expect(result.success).toBe(false);
  });

  test('rejects non-integer position', () => {
    const result = MoveCardSchema.safeParse({ list_id: 'list-2', position: 0.5 });
    expect(result.success).toBe(false);
  });
});
