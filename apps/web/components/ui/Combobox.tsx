'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ComboboxOption {
  id: string;
  name: string;
  meta?: string;
}

interface ComboboxProps {
  label?: string;
  placeholder?: string;
  hint?: string;
  selected: ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  onRemove: (id: string) => void;
  onSearch: (query: string) => Promise<ComboboxOption[]>;
  multi?: boolean;
  className?: string;
}

export function Combobox({
  label,
  placeholder = 'Search...',
  hint,
  selected,
  onSelect,
  onRemove,
  onSearch,
  multi = true,
  className,
}: ComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComboboxOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await onSearch(query);
        setResults(r);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const selectedIds = new Set(selected.map((s) => s.id));

  const handleSelect = (opt: ComboboxOption) => {
    onSelect(opt);
    if (!multi) {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={cn('space-y-1.5', className)} ref={containerRef}>
      {label ? (
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      ) : null}
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 min-h-9 rounded-md border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300"
            >
              {s.name}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
            <input
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder={placeholder}
              className="w-full bg-transparent pl-6 pr-2 py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
            />
          </div>
        </div>
        {open && query.trim() ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">No results.</div>
            ) : (
              results.map((r) => {
                const isSelected = selectedIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    disabled={isSelected}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors',
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'
                        : 'text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    )}
                  >
                    <span>{r.name}</span>
                    {r.meta ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{r.meta}</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}
