'use client';

import Link from 'next/link';
import { Workspace } from '@/types';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';

interface WorkspaceCardProps {
  workspace: Workspace;
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export function WorkspaceCard({ workspace, onEdit, onDelete }: WorkspaceCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <Link
        href={`/workspace/${workspace.id}`}
        className="block p-6 bg-bg-secondary rounded-lg border-2 border-transparent hover:border-accent-primary transition-all hover:shadow-lg"
      >
        <div className="flex items-start gap-4">
          {/* Icon with color */}
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: workspace.color }}
          >
            {workspace.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-text-primary mb-1 truncate">
              {workspace.name}
            </h3>
            {workspace.description && (
              <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                {workspace.description}
              </p>
            )}
            <div className="text-sm text-text-secondary">
              {workspace.boards.length} {workspace.boards.length === 1 ? 'board' : 'boards'}
            </div>
          </div>
        </div>
      </Link>

      {/* Actions menu */}
      {(onEdit || onDelete) && (
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
                      onEdit(workspace);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(workspace);
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
