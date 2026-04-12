'use client';

import { useRouter } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { Requirement } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-accent-danger/10 text-accent-danger',
  medium: 'bg-accent-warning/10 text-accent-warning',
  low: 'bg-accent-success/10 text-accent-success',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-bg-tertiary text-text-secondary',
  approved: 'bg-accent-secondary/10 text-accent-secondary',
  implemented: 'bg-accent-warning/10 text-accent-warning',
  verified: 'bg-accent-success/10 text-accent-success',
};

interface MatrixTabProps {
  requirements: Requirement[];
  workspaceId: string;
  boardId: string;
}

export function MatrixTab({ requirements, workspaceId, boardId }: MatrixTabProps) {
  const router = useRouter();
  const { getCard } = useData();

  if (requirements.length === 0) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <p className="text-sm">No requirements yet. Create your first one in the Requirements tab.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-tertiary">
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary w-24">Code</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary">Title</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary w-24">Priority</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary w-28">Status</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary">Linked Cards</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-text-secondary w-36">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map(req => (
            <tr key={req.id} className="border-b border-bg-tertiary hover:bg-bg-secondary/50 transition-colors">
              <td className="py-3 px-3">
                <span className="font-mono text-xs font-medium text-accent-primary">{req.code}</span>
              </td>
              <td className="py-3 px-3">
                <span className="text-text-primary">{req.title}</span>
                {req.description && (
                  <p className="text-xs text-text-secondary mt-0.5 truncate max-w-xs">{req.description}</p>
                )}
              </td>
              <td className="py-3 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[req.priority] ?? ''}`}>
                  {req.priority}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[req.status] ?? ''}`}>
                  {req.status}
                </span>
              </td>
              <td className="py-3 px-3">
                <div className="flex flex-wrap gap-1">
                  {(req.linkedCardIds ?? []).length === 0 ? (
                    <span className="text-xs text-text-secondary">—</span>
                  ) : (
                    req.linkedCardIds!.map(cardId => {
                      const card = getCard(cardId);
                      return (
                        <button
                          key={cardId}
                          onClick={() => router.push(`/workspace/${workspaceId}/board/${boardId}?card=${cardId}`)}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary text-xs hover:bg-accent-primary/20 transition-colors max-w-[140px] truncate"
                          title={card?.title ?? cardId}
                        >
                          {card?.title ?? cardId}
                        </button>
                      );
                    })
                  )}
                </div>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (req.coveragePercent ?? 0) === 100
                          ? 'bg-accent-success'
                          : (req.coveragePercent ?? 0) > 0
                            ? 'bg-accent-warning'
                            : 'bg-bg-tertiary'
                      }`}
                      style={{ width: `${req.coveragePercent ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-8 text-right">{req.coveragePercent ?? 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
