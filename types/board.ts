import { List } from './list';
import { CardType } from './card';

// Board sharing roles - ordered from most to least privileged
export type BoardRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  background?: string | null;
  allowedCardTypes?: CardType[]; // If undefined, all types are allowed
  isPublic?: boolean;
  shareRole?: BoardRole; // For shared boards, the user's role
  createdAt: string;
  updatedAt: string;
  lists: List[];
}
