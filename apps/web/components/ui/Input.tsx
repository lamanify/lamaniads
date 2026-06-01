import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:ring-zinc-600',
            error && 'border-red-500 focus:ring-red-500 dark:border-red-500',
            className
          )}
          {...props}
        />
        {hint && !error ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
