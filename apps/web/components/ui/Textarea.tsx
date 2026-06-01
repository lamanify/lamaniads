import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, maxLength, value, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    const charCount = typeof value === 'string' ? value.length : 0;
    return (
      <div className="space-y-1.5">
        {label ? (
          <div className="flex items-center justify-between">
            <label htmlFor={textareaId} className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {label}
            </label>
            {maxLength ? (
              <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono tabular-nums">
                {charCount} / {maxLength}
              </span>
            ) : null}
          </div>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          value={value}
          className={cn(
            'flex w-full min-h-[80px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:ring-zinc-600',
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
Textarea.displayName = 'Textarea';
