'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { MetricCard } from '@/components/analytics/MetricCard';
import { CheckCircle2, AlertTriangle, Circle, Layers } from 'lucide-react';

interface CoverageData {
  metrics: { total: number; covered: number; partial: number; notCovered: number };
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; covered: number; partial: number; notCovered: number }>;
  byList: Array<{ list: string; covered: number; partial: number; notCovered: number }>;
  atRisk: Array<{ id: string; code: string; title: string; status: string; coveragePercent: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  approved: '#3b82f6',
  implemented: '#f59e0b',
  verified: '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  implemented: 'Implemented',
  verified: 'Verified',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const tooltipStyle = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--bg-tertiary)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
};

export function CoverageTab({ data }: { data: CoverageData }) {
  const { metrics, byStatus, byPriority, byList, atRisk } = data;

  const statusChartData = byStatus.map(d => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: Number(d.count),
    status: d.status,
  }));

  const priorityChartData = byPriority.map(d => ({
    name: PRIORITY_LABELS[d.priority] ?? d.priority,
    Covered: d.covered,
    Partial: d.partial,
    'Not covered': d.notCovered,
  }));

  const listChartData = byList.map(d => ({
    name: d.list.length > 20 ? d.list.slice(0, 20) + '…' : d.list,
    Covered: d.covered,
    Partial: d.partial,
    'Not covered': d.notCovered,
  }));

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Requirements" value={metrics.total} icon={Layers} color="blue" />
        <MetricCard title="Fully Covered" value={metrics.covered} icon={CheckCircle2} color="green" />
        <MetricCard title="Partial Coverage" value={metrics.partial} icon={Circle} color="amber" />
        <MetricCard
          title="Not Covered"
          value={metrics.notCovered}
          icon={AlertTriangle}
          color={metrics.notCovered > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart — by status */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
          <h3 className="text-sm font-medium text-text-primary mb-4">Requirements by Status</h3>
          {statusChartData.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Horizontal bar — by priority */}
        <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
          <h3 className="text-sm font-medium text-text-primary mb-4">Coverage by Priority</h3>
          {priorityChartData.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityChartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--bg-tertiary)' }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>} />
                <Bar dataKey="Covered" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Partial" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Not covered" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stacked bar — by list */}
      {listChartData.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
          <h3 className="text-sm font-medium text-text-primary mb-4">Coverage by Kanban List</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, listChartData.length * 48)}>
            <BarChart data={listChartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--bg-tertiary)' }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>} />
              <Bar dataKey="Covered" stackId="a" fill="#10b981" />
              <Bar dataKey="Partial" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Not covered" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* At-risk requirements */}
      {atRisk.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
          <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-danger" />
            At-Risk Requirements
            <span className="text-xs text-text-secondary font-normal">(high priority, not verified)</span>
          </h3>
          <div className="space-y-2">
            {atRisk.map(r => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent-danger/5 border border-accent-danger/20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-accent-danger font-medium shrink-0">{r.code}</span>
                  <span className="text-sm text-text-primary truncate">{r.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-text-secondary capitalize">{r.status}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-warning rounded-full"
                        style={{ width: `${r.coveragePercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary w-8 text-right">{r.coveragePercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
