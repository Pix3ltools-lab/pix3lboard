'use client';

import { BugSeverity } from '@/types';

interface SeveritySelectorProps {
  value?: BugSeverity;
  onChange: (severity: BugSeverity | undefined) => void;
}

const SEVERITIES = [
  { value: 'low' as const, label: 'Low', color: '#10b981' },
  { value: 'medium' as const, label: 'Medium', color: '#f59e0b' },
  { value: 'high' as const, label: 'High', color: '#ef4444' },
  { value: 'critical' as const, label: 'Critical', color: '#dc2626' },
];

export function SeveritySelector({ value, onChange }: SeveritySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Bug Severity
      </label>
      <div className="grid grid-cols-2 gap-2">
        {SEVERITIES.map((severity) => (
          <button
            key={severity.value}
            type="button"
            onClick={() => onChange(value === severity.value ? undefined : severity.value)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              value === severity.value
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-bg-tertiary hover:border-bg-tertiary hover:bg-bg-secondary'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: severity.color }}
              />
              <span className="font-medium text-text-primary">{severity.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
