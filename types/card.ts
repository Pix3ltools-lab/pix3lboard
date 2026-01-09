export type CardType = 'music' | 'video' | 'image' | 'task';

export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;

  // AI Creator specific fields (MVP minimal)
  type?: CardType;
  prompt?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  aiTool?: string; // Free text, not enum in MVP

  // Simple fields
  tags?: string[]; // Max 5 tags
  dueDate?: string; // ISO date string
  links?: string[]; // Simple URL array, max 3
  responsible?: string; // Person responsible for the card (free text)
  jobNumber?: string; // Job number in format: Letter-2digits-4digits (e.g., C-26-0001)

  createdAt: string;
  updatedAt: string;
}
