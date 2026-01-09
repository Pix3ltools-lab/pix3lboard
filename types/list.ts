import { Card } from './card';

export interface List {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  cards: Card[];
}
