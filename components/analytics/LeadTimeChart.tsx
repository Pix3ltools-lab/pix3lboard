'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LeadTimeChartProps {
  data: Array<{ card_id: string; title: string; lead_time_days: number }>;
}

export function LeadTimeChart({ data }: LeadTimeChartProps) {
  if (data.length === 0) {
    return <p className="text-text-secondary text-sm text-center py-8">No completed cards in this period</p>;
  }

  const chartData = data
    .slice(0, 20)
    .map(d => ({
      name: d.title.length > 25 ? d.title.slice(0, 25) + '...' : d.title,
      days: Number(d.lead_time_days),
    }));

  return (
    <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
      <h3 className="text-sm font-medium text-text-primary mb-4">Lead Time (days per card)</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--bg-tertiary)' }}
            tickLine={false}
            unit="d"
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
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
            formatter={(value) => [`${value} days`, 'Lead Time']}
          />
          <Bar dataKey="days" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
