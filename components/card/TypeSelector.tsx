'use client';

import { CardType } from '@/types';
import { CARD_TYPES } from '@/lib/constants';

interface TypeSelectorProps {
  value?: CardType;
  onChange: (type: CardType) => void;
}

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Card Type
      </label>
      <div className="grid grid-cols-2 gap-2">
        {CARD_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value as CardType)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              value === type.value
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-bg-tertiary hover:border-bg-tertiary hover:bg-bg-secondary'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{type.icon}</span>
              <span className="font-medium text-text-primary">{type.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
