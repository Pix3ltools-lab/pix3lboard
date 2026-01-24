import { z } from 'zod';

// Card link schema
const LinkSchema = z.object({
  url: z.string().url().max(2000),
  title: z.string().max(200).optional(),
});

// Checklist item schema
const ChecklistItemSchema = z.object({
  id: z.string().max(50),
  text: z.string().max(500),
  checked: z.boolean(),
});

// Card schema
export const CardSchema = z.object({
  id: z.string().max(50),
  listId: z.string().max(50),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  position: z.number().int().min(0),
  type: z.string().max(50).optional(),
  prompt: z.string().max(10000).optional(),
  rating: z.number().int().min(0).max(5).optional().nullable(),
  aiTool: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  dueDate: z.string().max(50).optional(),
  links: z.array(LinkSchema).max(20).optional(),
  responsible: z.string().max(100).optional(),
  responsibleUserId: z.string().max(50).optional(),
  responsibleUserName: z.string().max(100).optional(),
  responsibleUserEmail: z.string().max(200).optional(),
  jobNumber: z.string().max(50).optional(),
  severity: z.string().max(50).optional(),
  priority: z.string().max(50).optional(),
  effort: z.string().max(50).optional(),
  attendees: z.array(z.string().max(100)).max(50).optional(),
  meetingDate: z.string().max(50).optional(),
  checklist: z.array(ChecklistItemSchema).max(100).optional(),
  isArchived: z.boolean().optional(),
  thumbnail: z.string().max(500).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  commentCount: z.number().int().min(0).optional(),
});

// List schema
export const ListSchema = z.object({
  id: z.string().max(50),
  boardId: z.string().max(50),
  name: z.string().min(1).max(200),
  position: z.number().int().min(0),
  color: z.string().max(50).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cards: z.array(CardSchema).max(1000),
});

// Board schema
export const BoardSchema = z.object({
  id: z.string().max(50),
  workspaceId: z.string().max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  background: z.string().max(500).optional(),
  allowedCardTypes: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  shareRole: z.enum(['owner', 'viewer']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lists: z.array(ListSchema).max(100),
});

// Workspace schema
export const WorkspaceSchema = z.object({
  id: z.string().max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(50).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isShared: z.boolean().optional(),
  boards: z.array(BoardSchema).max(100),
});

// Full data payload schema
export const DataPayloadSchema = z.object({
  workspaces: z.array(WorkspaceSchema).max(50),
});

// Sync change schema
export const SyncChangeSchema = z.object({
  entityType: z.enum(['workspace', 'board', 'list', 'card']),
  entityId: z.string().max(50),
  operation: z.enum(['create', 'update', 'delete']),
  parentId: z.string().max(50).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number().int().positive(),
});

// Sync payload schema
export const SyncPayloadSchema = z.object({
  changes: z.array(SyncChangeSchema).max(1000),
  clientVersion: z.number().int().optional(),
});

export type ValidatedWorkspace = z.infer<typeof WorkspaceSchema>;
export type ValidatedBoard = z.infer<typeof BoardSchema>;
export type ValidatedList = z.infer<typeof ListSchema>;
export type ValidatedCard = z.infer<typeof CardSchema>;
export type ValidatedSyncChange = z.infer<typeof SyncChangeSchema>;
export type ValidatedSyncPayload = z.infer<typeof SyncPayloadSchema>;
