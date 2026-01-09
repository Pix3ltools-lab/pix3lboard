import { TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 bg-bg-secondary border border-bg-tertiary rounded',
            'text-text-primary placeholder:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-none',
            error && 'border-accent-danger focus:ring-accent-danger',
            className
          )}
          rows={4}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-accent-danger">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
