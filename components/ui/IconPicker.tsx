'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { DEFAULT_WORKSPACE_ICONS } from '@/lib/constants';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Selected icon display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded text-left focus:outline-none focus:ring-2 focus:ring-accent-primary hover:bg-bg-tertiary transition-colors"
        >
          <span className="text-2xl">{value}</span>
        </button>

        {/* Icon grid dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute z-20 mt-1 w-full bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg p-2">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {DEFAULT_WORKSPACE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      'p-2 text-2xl rounded hover:bg-bg-tertiary transition-colors',
                      value === icon && 'bg-accent-primary/20 ring-2 ring-accent-primary'
                    )}
                  >
                    {icon}
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
