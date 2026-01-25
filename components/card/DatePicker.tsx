'use client';

import { X } from 'lucide-react';

interface DatePickerProps {
  value?: string; // ISO date string
  onChange: (date: string | undefined) => void;
  label?: string;
}

export function DatePicker({ value, onChange, label = 'Due Date' }: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      // Convert to ISO string at midnight local time
      const date = new Date(dateValue + 'T00:00:00');
      onChange(date.toISOString());
    } else {
      onChange(undefined);
    }
  };

  const handleClear = () => {
    onChange(undefined);
  };

  // Convert ISO string to YYYY-MM-DD for input (using local timezone)
  const inputValue = value
    ? new Date(value).toLocaleDateString('en-CA') // en-CA gives YYYY-MM-DD format
    : '';

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="date"
          lang="en"
          value={inputValue}
          onChange={handleChange}
          className="flex-1 px-3 py-2 bg-bg-primary border border-bg-tertiary rounded text-sm text-text-primary outline-none focus:border-accent-primary"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="h-4 w-4 text-text-secondary" />
          </button>
        )}
      </div>
    </div>
  );
}
