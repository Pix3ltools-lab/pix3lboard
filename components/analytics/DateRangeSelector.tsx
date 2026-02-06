'use client';

interface DateRangeSelectorProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function DateRangeSelector({ from, to, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((preset) => {
        const presetFrom = daysAgo(preset.days);
        const isActive = from === presetFrom && to === today();
        return (
          <button
            key={preset.label}
            onClick={() => onChange(presetFrom, today())}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              isActive
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-bg-tertiary hover:border-text-secondary'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
      <div className="flex items-center gap-1.5 ml-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="px-2 py-1.5 text-xs rounded-md border border-bg-tertiary bg-bg-secondary text-text-primary"
        />
        <span className="text-text-secondary text-xs">-</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="px-2 py-1.5 text-xs rounded-md border border-bg-tertiary bg-bg-secondary text-text-primary"
        />
      </div>
    </div>
  );
}
