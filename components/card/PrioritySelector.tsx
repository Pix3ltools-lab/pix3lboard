'use client';

import { Priority, Effort } from '@/types';

interface PrioritySelectorProps {
  priority?: Priority;
  effort?: Effort;
  onPriorityChange: (priority: Priority | undefined) => void;
  onEffortChange: (effort: Effort | undefined) => void;
}

const PRIORITIES = [
  { value: 'low' as const, label: 'Low', badge: 'P3' },
  { value: 'medium' as const, label: 'Medium', badge: 'P2' },
  { value: 'high' as const, label: 'High', badge: 'P1' },
];

const EFFORTS = [
  { value: 'small' as const, label: 'Small', badge: 'S' },
  { value: 'medium' as const, label: 'Medium', badge: 'M' },
  { value: 'large' as const, label: 'Large', badge: 'L' },
];

export function PrioritySelector({ priority, effort, onPriorityChange, onEffortChange }: PrioritySelectorProps) {
  return (
    <div className="space-y-4">
      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Priority
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPriorityChange(priority === p.value ? undefined : p.value)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                priority === p.value
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-bg-tertiary hover:border-bg-tertiary hover:bg-bg-secondary'
              }`}
            >
              <div className="font-medium text-text-primary text-sm mb-1">{p.badge}</div>
              <div className="text-xs text-text-secondary">{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Effort */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Effort Estimation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {EFFORTS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => onEffortChange(effort === e.value ? undefined : e.value)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                effort === e.value
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-bg-tertiary hover:border-bg-tertiary hover:bg-bg-secondary'
              }`}
            >
              <div className="font-medium text-text-primary text-sm mb-1">{e.badge}</div>
              <div className="text-xs text-text-secondary">{e.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
