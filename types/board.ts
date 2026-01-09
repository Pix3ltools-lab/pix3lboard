import { List } from './list';

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  background?: string;
  createdAt: string;
  updatedAt: string;
  lists: List[];
}
