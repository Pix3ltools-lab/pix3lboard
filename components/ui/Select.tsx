import { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded',
            'text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-accent-danger focus:ring-accent-danger',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-accent-danger">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
