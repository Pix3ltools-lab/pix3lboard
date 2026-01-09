'use client';

import { Workspace } from '@/types';
import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export function WorkspaceList({ workspaces, onEdit, onDelete }: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No workspaces found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
