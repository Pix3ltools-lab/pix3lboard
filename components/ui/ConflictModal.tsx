'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import type { SyncConflict } from '@/types';
import { format } from 'date-fns';

interface ConflictModalProps {
  conflict: SyncConflict | null;
  onOverwrite: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

const entityTypeLabels: Record<string, string> = {
  workspace: 'Workspace',
  board: 'Board',
  list: 'List',
  card: 'Card',
};

export function ConflictModal({ conflict, onOverwrite, onDiscard, onClose }: ConflictModalProps) {
  if (!conflict) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal isOpen={!!conflict} onClose={onClose} title="Conflict Detected" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-text-primary">
              This {entityTypeLabels[conflict.entityType]?.toLowerCase() || 'item'} has been modified
            </p>
            <p className="text-text-secondary mt-1">
              &quot;{conflict.entityName}&quot; was changed by another session while you were editing it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-bg-tertiary/50 rounded-lg">
            <p className="text-text-secondary mb-1">Your version</p>
            <p className="text-text-primary font-mono text-xs">
              {formatDate(conflict.clientUpdatedAt)}
            </p>
          </div>
          <div className="p-3 bg-bg-tertiary/50 rounded-lg">
            <p className="text-text-secondary mb-1">Server version</p>
            <p className="text-text-primary font-mono text-xs">
              {formatDate(conflict.serverUpdatedAt)}
            </p>
          </div>
        </div>

        <div className="border-t border-bg-tertiary pt-4">
          <p className="text-sm text-text-secondary mb-4">What would you like to do?</p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={onOverwrite}
              variant="danger"
              className="w-full justify-center"
            >
              Overwrite with my changes
            </Button>
            <Button
              onClick={onDiscard}
              variant="secondary"
              className="w-full justify-center"
            >
              Discard my changes (keep server version)
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full justify-center"
            >
              Cancel (decide later)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
