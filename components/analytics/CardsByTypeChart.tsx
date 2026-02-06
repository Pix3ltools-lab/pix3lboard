'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CardsByTypeChartProps {
  data: Array<{ type: string; count: number }>;
}

const TYPE_COLORS: Record<string, string> = {
  task: '#3b82f6',
  bug: '#ef4444',
  feature: '#10b981',
  text: '#6b7280',
  meeting: '#f59e0b',
  image: '#ec4899',
  video: '#8b5cf6',
  music: '#14b8a6',
  audio: '#6366f1',
};

export function CardsByTypeChart({ data }: CardsByTypeChartProps) {
  if (data.length === 0) {
    return <p className="text-text-secondary text-sm text-center py-8">No data available</p>;
  }

  const chartData = data.map(d => ({
    name: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    value: Number(d.count),
    type: d.type,
  }));

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
      <h3 className="text-sm font-medium text-text-primary mb-4">Cards per Type</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={TYPE_COLORS[entry.type] || '#6b7280'} />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
