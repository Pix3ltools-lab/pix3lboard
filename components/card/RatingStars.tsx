'use client';

import { Star } from 'lucide-react';

interface RatingStarsProps {
  value?: 1 | 2 | 3 | 4 | 5;
  onChange: (rating: 1 | 2 | 3 | 4 | 5 | undefined) => void;
}

export function RatingStars({ value, onChange }: RatingStarsProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        Rating
      </label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating as 1 | 2 | 3 | 4 | 5)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-6 w-6 ${
                value && rating <= value
                  ? 'fill-accent-warning text-accent-warning'
                  : 'text-bg-tertiary hover:text-accent-warning/50'
              }`}
            />
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ml-2 text-xs text-text-secondary hover:text-text-primary"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
