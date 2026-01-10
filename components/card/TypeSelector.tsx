'use client';

import { CardType } from '@/types';
import { CARD_TYPES } from '@/lib/constants';

interface TypeSelectorProps {
  value?: CardType;
  onChange: (type: CardType) => void;
  allowedCardTypes?: CardType[]; // If undefined, all types are shown
}

export function TypeSelector({ value, onChange, allowedCardTypes }: TypeSelectorProps) {
  // Filter card types based on allowed types for the board
  const availableTypes = allowedCardTypes
    ? CARD_TYPES.filter((type) => allowedCardTypes.includes(type.value))
    : CARD_TYPES;

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Card Type
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value as CardType)}
        className="w-full px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors"
      >
        <option value="">Select a type...</option>
        {availableTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.icon} {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}
