'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Workspace, Board } from '@/types';
import { FolderInput } from 'lucide-react';

interface MoveBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board | null;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  onMove: (boardId: string, targetWorkspaceId: string) => void;
}

export function MoveBoardModal({
  isOpen,
  onClose,
  board,
  workspaces,
  currentWorkspaceId,
  onMove,
}: MoveBoardModalProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Filter out current workspace
  const availableWorkspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId);

  const handleMove = () => {
    if (!board || !selectedWorkspaceId) return;
    onMove(board.id, selectedWorkspaceId);
    onClose();
  };

  const handleClose = () => {
    setSelectedWorkspaceId(null);
    onClose();
  };

  if (!board) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Move "${board.name}"`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Select a workspace to move this board to:
        </p>

        {availableWorkspaces.length === 0 ? (
          <div className="p-4 bg-bg-secondary rounded-lg text-center">
            <p className="text-sm text-text-secondary">
              No other workspaces available. Create another workspace first.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableWorkspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setSelectedWorkspaceId(ws.id)}
                className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center gap-3 text-left ${
                  selectedWorkspaceId === ws.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-bg-tertiary hover:border-bg-tertiary/80 hover:bg-bg-secondary'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: ws.color || '#374151' }}
                >
                  {ws.icon || '📁'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary truncate">{ws.name}</p>
                  <p className="text-xs text-text-secondary">
                    {ws.boards.length} board{ws.boards.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedWorkspaceId}
            className="flex items-center gap-2"
          >
            <FolderInput className="h-4 w-4" />
            Move
          </Button>
        </div>
      </div>
    </Modal>
  );
}
