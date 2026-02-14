import { z } from 'zod';

// --- Auth ---

export const TokenRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// --- Boards ---

export const CreateBoardSchema = z.object({
  workspace_id: z.string().max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  background: z.string().max(500).optional(),
  allowed_card_types: z.array(z.string().max(50)).max(20).optional(),
  is_public: z.boolean().optional(),
});

export const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  background: z.string().max(500).nullable().optional(),
  allowed_card_types: z.array(z.string().max(50)).max(20).nullable().optional(),
  is_public: z.boolean().optional(),
});

// --- Lists ---

export const CreateListSchema = z.object({
  name: z.string().min(1).max(200),
  position: z.number().int().min(0).optional(),
  color: z.string().max(50).optional(),
});

export const UpdateListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  position: z.number().int().min(0).optional(),
  color: z.string().max(50).nullable().optional(),
});

// --- Cards ---

export const CreateCardSchema = z.object({
  list_id: z.string().max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  position: z.number().int().min(0).optional(),
  type: z.string().max(50).optional(),
  prompt: z.string().max(10000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  ai_tool: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  due_date: z.string().max(50).optional(),
  links: z.array(z.string().url().max(2000)).max(20).optional(),
  responsible: z.string().max(100).optional(),
  responsible_user_id: z.string().max(50).optional(),
  job_number: z.string().max(50).optional(),
  severity: z.string().max(50).optional(),
  priority: z.string().max(50).optional(),
  effort: z.string().max(50).optional(),
  attendees: z.array(z.string().max(100)).max(50).optional(),
  meeting_date: z.string().max(50).optional(),
  checklist: z.array(z.object({
    id: z.string().max(50),
    text: z.string().max(500),
    checked: z.boolean(),
  })).max(100).optional(),
  thumbnail: z.string().max(500).optional(),
  wiki_page_id: z.string().max(50).optional(),
});

export const UpdateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  position: z.number().int().min(0).optional(),
  type: z.string().max(50).nullable().optional(),
  prompt: z.string().max(10000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  ai_tool: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
  due_date: z.string().max(50).nullable().optional(),
  links: z.array(z.string().url().max(2000)).max(20).nullable().optional(),
  responsible: z.string().max(100).nullable().optional(),
  responsible_user_id: z.string().max(50).nullable().optional(),
  job_number: z.string().max(50).nullable().optional(),
  severity: z.string().max(50).nullable().optional(),
  priority: z.string().max(50).nullable().optional(),
  effort: z.string().max(50).nullable().optional(),
  attendees: z.array(z.string().max(100)).max(50).nullable().optional(),
  meeting_date: z.string().max(50).nullable().optional(),
  checklist: z.array(z.object({
    id: z.string().max(50),
    text: z.string().max(500),
    checked: z.boolean(),
  })).max(100).nullable().optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  wiki_page_id: z.string().max(50).nullable().optional(),
});

export const MoveCardSchema = z.object({
  list_id: z.string().max(50),
  position: z.number().int().min(0),
});
