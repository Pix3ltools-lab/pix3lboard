'use client';

import Link from 'next/link';
import { Board } from '@/types';
import { MoreVertical, Trash2, Edit, Copy } from 'lucide-react';
import { useState } from 'react';
import { formatRelative } from '@/lib/utils/date';

interface BoardCardProps {
  board: Board;
  workspaceId: string;
  onEdit?: (board: Board) => void;
  onDelete?: (board: Board) => void;
  onDuplicate?: (board: Board) => void;
}

export function BoardCard({ board, workspaceId, onEdit, onDelete, onDuplicate }: BoardCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const totalCards = board.lists.reduce((sum, list) => sum + list.cards.length, 0);

  return (
    <div className="relative group">
      <Link
        href={`/workspace/${workspaceId}/board/${board.id}`}
        className="block p-6 bg-bg-secondary rounded-lg border-2 border-transparent hover:border-accent-primary transition-all hover:shadow-lg"
      >
        {/* Background preview (if set) */}
        {board.background && (
          <div
            className="absolute inset-0 rounded-lg opacity-10"
            style={{ backgroundColor: board.background }}
          />
        )}

        <div className="relative">
          <h3 className="text-xl font-semibold text-text-primary mb-2 truncate">
            {board.name}
          </h3>

          {board.description && (
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">
              {board.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{board.lists.length} lists</span>
            <span>•</span>
            <span>{totalCards} cards</span>
          </div>

          <div className="mt-2 text-xs text-text-secondary">
            Updated {formatRelative(board.updatedAt)}
          </div>
        </div>
      </Link>

      {/* Actions menu */}
      {(onEdit || onDelete || onDuplicate) && (
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded hover:bg-bg-tertiary transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="h-5 w-5 text-text-secondary" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-1 w-48 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-20 py-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit(board);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDuplicate(board);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(board);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
