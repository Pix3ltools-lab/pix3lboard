'use client';

import { Board } from '@/types';
import { BoardCard } from './BoardCard';

interface BoardListProps {
  boards: Board[];
  workspaceId: string;
  onEdit?: (board: Board) => void;
  onDelete?: (board: Board) => void;
  onDuplicate?: (board: Board) => void;
  onMove?: (board: Board) => void;
}

export function BoardList({ boards, workspaceId, onEdit, onDelete, onDuplicate, onMove }: BoardListProps) {
  if (boards.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No boards found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {boards.map((board) => (
        <BoardCard
          key={board.id}
          board={board}
          workspaceId={workspaceId}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
