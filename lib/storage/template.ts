import { Board, List, Card } from '@/types';
import { generateId } from '@/lib/utils/id';

/**
 * Create the "AI Music Video Project" template board
 * with 6 lists and 5 example cards
 */
export function createAIMusicVideoBoard(workspaceId: string): Board {
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

  // Create 5 example cards
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

  const card4: Card = {
    id: generateId(),
    listId: ideaList.id,
    title: 'Video Script',
    description: 'Write narrative structure and scene descriptions',
    position: 1000,
    type: 'text',
    prompt: 'Write a music video script for a synthwave song about...',
    aiTool: 'Claude',
    tags: ['script', 'planning'],
    createdAt: now,
    updatedAt: now,
  };

  const card5: Card = {
    id: generateId(),
    listId: visualList.id,
    title: 'Voiceover Narration',
    description: 'AI-generated voice for intro sequence',
    position: 1000,
    type: 'audio',
    prompt: 'deep, dramatic voice with slight echo, narrating: "In a world where..."',
    rating: 4,
    aiTool: 'ElevenLabs',
    tags: ['voiceover', 'intro'],
    createdAt: now,
    updatedAt: now,
  };

  // Assign cards to lists
  musicList.cards.push(card1);
  videoList.cards.push(card2);
  editList.cards.push(card3);
  ideaList.cards.push(card4);
  visualList.cards.push(card5);

  // Create board with all lists
  return {
    id: boardId,
    workspaceId,
    name: 'AI Music Video Project',
    description: 'Template for managing AI-generated music video projects',
    allowedCardTypes: ['music', 'video', 'image', 'audio', 'text', 'task'],
    createdAt: now,
    updatedAt: now,
    lists: [ideaList, musicList, visualList, videoList, editList, doneList],
  };
}

/**
 * Create the "Project Management" template board
 * with 5 lists and 5 example cards
 */
export function createProjectManagementBoard(workspaceId: string): Board {
  const now = new Date().toISOString();
  const boardId = generateId();

  // Create 5 lists
  const todoList: List = {
    id: generateId(),
    boardId,
    name: '📋 To Do',
    position: 1000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const inProgressList: List = {
    id: generateId(),
    boardId,
    name: '🔄 In Progress',
    position: 2000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const inReviewList: List = {
    id: generateId(),
    boardId,
    name: '👀 In Review',
    position: 3000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const approveList: List = {
    id: generateId(),
    boardId,
    name: '✅ Approve',
    position: 4000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  const deliveredList: List = {
    id: generateId(),
    boardId,
    name: '🚀 Delivered',
    position: 5000,
    createdAt: now,
    updatedAt: now,
    cards: [],
  };

  // Create 5 example cards
  const card1: Card = {
    id: generateId(),
    listId: todoList.id,
    title: 'Define project scope',
    description: 'Document project goals, deliverables, and timeline',
    position: 1000,
    type: 'task',
    tags: ['planning'],
    createdAt: now,
    updatedAt: now,
  };

  const card2: Card = {
    id: generateId(),
    listId: inProgressList.id,
    title: 'Design mockups',
    description: 'Create initial design concepts and wireframes',
    position: 1000,
    type: 'task',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    tags: ['design'],
    createdAt: now,
    updatedAt: now,
  };

  const card3: Card = {
    id: generateId(),
    listId: inReviewList.id,
    title: 'Review documentation',
    description: 'Technical documentation needs peer review before approval',
    position: 1000,
    type: 'task',
    tags: ['documentation', 'review'],
    createdAt: now,
    updatedAt: now,
  };

  const card4: Card = {
    id: generateId(),
    listId: todoList.id,
    title: 'User authentication system',
    description: 'Implement secure login and registration flow',
    position: 2000,
    type: 'feature',
    priority: 'high',
    effort: 'large',
    tags: ['security', 'backend'],
    createdAt: now,
    updatedAt: now,
  };

  const card5: Card = {
    id: generateId(),
    listId: approveList.id,
    title: 'Sprint Planning Meeting',
    description: 'Review backlog and plan next sprint',
    position: 1000,
    type: 'meeting',
    attendees: ['Team Lead', 'Product Owner', 'Developers'],
    meetingDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    tags: ['sprint', 'planning'],
    createdAt: now,
    updatedAt: now,
  };

  // Assign cards to lists
  todoList.cards.push(card1);
  todoList.cards.push(card4);
  inProgressList.cards.push(card2);
  inReviewList.cards.push(card3);
  approveList.cards.push(card5);

  // Create board with all lists
  return {
    id: boardId,
    workspaceId,
    name: 'Project Management Board',
    description: 'Template for managing projects with standard workflow',
    allowedCardTypes: ['task', 'bug', 'feature', 'meeting'],
    createdAt: now,
    updatedAt: now,
    lists: [todoList, inProgressList, inReviewList, approveList, deliveredList],
  };
}

/**
 * Legacy function name for backward compatibility
 */
export function createTemplateBoard(workspaceId: string): Board {
  return createAIMusicVideoBoard(workspaceId);
}
