'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ThroughputChartProps {
  data: Array<{ week: string; created: number; archived: number }>;
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  if (data.length === 0) {
    return <p className="text-text-secondary text-sm text-center py-8">No data available for this period</p>;
  }

  const chartData = data.map(d => ({
    week: d.week,
    Created: Number(d.created),
    Completed: Number(d.archived),
  }));

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
      <h3 className="text-sm font-medium text-text-primary mb-4">Created vs Completed (weekly)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--bg-tertiary)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          />
          <Legend
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>}
          />
          <Bar dataKey="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
