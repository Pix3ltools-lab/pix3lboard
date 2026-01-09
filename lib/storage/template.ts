import { Board, List, Card } from '@/types';
import { generateId } from '@/lib/utils/id';

/**
 * Create the "AI Music Video Project" template board
 * with 6 lists and 3 example cards
 */
export function createTemplateBoard(workspaceId: string): Board {
  const now = new Date().toISOString();
  const boardId = generateId();

  // Create 6 lists
  const ideaList: List = {
    id: generateId(),
    boardId,
    name: '💡 Ideas',
    position: 1000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const musicList: List = {
    id: generateId(),
    boardId,
    name: '🎵 Music',
    position: 2000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const visualList: List = {
    id: generateId(),
    boardId,
    name: '🎨 Visuals',
    position: 3000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const videoList: List = {
    id: generateId(),
    boardId,
    name: '🎬 Video',
    position: 4000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const editList: List = {
    id: generateId(),
    boardId,
    name: '✂️ Edit',
    position: 5000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const doneList: List = {
    id: generateId(),
    boardId,
    name: '✅ Done',
    position: 6000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  // Create 3 example cards
  const card1: Card = {
    id: generateId(),
    listId: musicList.id,
    title: 'Track Generation',
    description: 'Main track for the video',
    position: 1000,
    type: 'music',
    prompt: 'synthwave electronic, female vocals, 140 bpm, atmospheric',
    rating: 5,
    aiTool: 'Suno',
    tags: ['synthwave', 'main-track'],
    createdAt: now,
    updatedAt: now,
  };

  const card2: Card = {
    id: generateId(),
    listId: videoList.id,
    title: 'Opening Scene',
    description: 'Aerial city shot',
    position: 1000,
    type: 'video',
    prompt: 'drone shot through cyberpunk city at night, neon lights, rain, cinematic',
    aiTool: 'Runway',
    tags: ['opening', 'aerial'],
    createdAt: now,
    updatedAt: now,
  };

  const card3: Card = {
    id: generateId(),
    listId: editList.id,
    title: 'Color Grading',
    description: 'Apply cyberpunk LUT to all clips',
    position: 1000,
    type: 'task',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    tags: ['post-production'],
    createdAt: now,
    updatedAt: now,
  };

  // Assign cards to lists
  musicList.cards.push(card1);
  videoList.cards.push(card2);
  editList.cards.push(card3);

  // Create board with all lists
  return {
    id: boardId,
    workspaceId,
    name: 'AI Music Video Project',
    description: 'Template for managing AI-generated music video projects',
    createdAt: now,
    updatedAt: now,
    lists: [ideaList, musicList, visualList, videoList, editList, doneList],
  };
}
