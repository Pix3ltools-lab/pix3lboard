'use client';

import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'purple' | 'blue' | 'green' | 'amber' | 'red';
}

const colorMap = {
  purple: 'text-accent-primary bg-accent-primary/10',
  blue: 'text-accent-secondary bg-accent-secondary/10',
  green: 'text-accent-success bg-accent-success/10',
  amber: 'text-accent-warning bg-accent-warning/10',
  red: 'text-accent-danger bg-accent-danger/10',
};

export function MetricCard({ title, value, subtitle, icon: Icon, color = 'purple' }: MetricCardProps) {
  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{title}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
