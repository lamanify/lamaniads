import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, options, id, ...props }, ref) => {
    const selectId = id || React.useId();
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={selectId} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white px-3 pr-9 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-600',
              error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
        </div>
        {hint && !error ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
