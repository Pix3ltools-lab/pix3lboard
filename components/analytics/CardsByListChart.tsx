'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CardsByListChartProps {
  data: Array<{ list_name: string; count: number }>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export function CardsByListChart({ data }: CardsByListChartProps) {
  if (data.length === 0) {
    return <p className="text-text-secondary text-sm text-center py-8">No data available</p>;
  }

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
      <h3 className="text-sm font-medium text-text-primary mb-4">Cards per List</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis
            dataKey="list_name"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
