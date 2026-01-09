'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { DEFAULT_WORKSPACE_COLORS } from '@/lib/constants';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Selected color display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-accent-primary hover:bg-bg-tertiary transition-colors"
        >
          <div
            className="w-6 h-6 rounded border border-bg-tertiary"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-text-primary">{value}</span>
        </button>

        {/* Color grid dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute z-20 mt-1 w-full bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg p-3">
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_WORKSPACE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onChange(color);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      'relative w-12 h-12 rounded-lg border-2 transition-all hover:scale-110',
                      value === color
                        ? 'border-white ring-2 ring-accent-primary'
                        : 'border-bg-tertiary hover:border-text-secondary'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {value === color && (
                      <Check className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
