// Storage constants
export const STORAGE_KEY = 'pix3lboard-data';
export const MAX_SIZE_MB = 5;
export const WARNING_THRESHOLD_MB = 3;
export const WARNING_THRESHOLD_PERCENTAGE = 60;

// Limits
export const MAX_TAGS_PER_CARD = 5;
export const MAX_LINKS_PER_CARD = 3;

// Default icons for workspace
export const DEFAULT_WORKSPACE_ICONS = [
  '💼', '🏠', '🎨', '🎵', '🎬', '📱',
  '💡', '🚀', '⭐', '🔥', '✨', '🎯',
  '📊', '🎮', '🌟', '🎪'
];

// Default colors for workspace
export const DEFAULT_WORKSPACE_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

// Card types
export const CARD_TYPES = [
  { value: 'music', label: 'Music', icon: '🎵', color: '#8b5cf6' },
  { value: 'video', label: 'Video', icon: '🎬', color: '#3b82f6' },
  { value: 'image', label: 'Image', icon: '🖼️', color: '#ec4899' },
  { value: 'task', label: 'Task', icon: '✅', color: '#10b981' },
] as const;

// Toast duration
export const TOAST_DURATION = 3000; // milliseconds
export const TOAST_DURATION_ERROR = 5000;

// App info
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'pix3lboard';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
