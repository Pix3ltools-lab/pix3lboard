import { Board } from './board';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Emoji icon
  color?: string; // Hex color
  createdAt: string;
  updatedAt: string;
  boards: Board[];
}
