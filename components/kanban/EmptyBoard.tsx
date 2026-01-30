'use client';

import { Button } from '@/components/ui/Button';
import { Kanban } from 'lucide-react';

interface EmptyBoardProps {
  onCreateList?: () => void;
}

export function EmptyBoard({ onCreateList }: EmptyBoardProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-bg-secondary rounded-lg flex items-center justify-center mb-4">
          <Kanban className="h-8 w-8 text-accent-primary" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No Lists Yet
        </h3>
        <p className="text-text-secondary mb-6">
          {onCreateList
            ? 'Get started by creating your first list to organize your tasks and ideas.'
            : 'This board has no lists yet.'}
        </p>
        {onCreateList && (
          <Button onClick={onCreateList}>
            Create Your First List
          </Button>
        )}
      </div>
    </div>
  );
}
