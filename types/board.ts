import { List } from './list';
import { CardType } from './card';

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  background?: string;
  allowedCardTypes?: CardType[]; // If undefined, all types are allowed
  createdAt: string;
  updatedAt: string;
  lists: List[];
}
