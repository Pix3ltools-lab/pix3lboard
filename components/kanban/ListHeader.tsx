'use client';

import { useState } from 'react';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';

interface ListHeaderProps {
  name: string;
  cardCount: number;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export function ListHeader({ name, cardCount, onRename, onDelete }: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);

  const handleSubmit = () => {
    if (editName.trim() && editName !== name && onRename) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-3 px-1">
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          className="flex-1 bg-bg-primary border border-accent-primary rounded px-2 py-1 text-sm font-semibold text-text-primary outline-none"
        />
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <h3 className="font-semibold text-text-primary">{name}</h3>
          <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full">
            {cardCount}
          </span>
        </div>
      )}

      {!isEditing && (onRename || onDelete) && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-text-secondary" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-1 w-40 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-20 py-1">
                {onRename && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Rename
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-accent-danger hover:bg-accent-danger/10 transition-colors flex items-center gap-2"
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
