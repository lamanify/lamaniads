'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CircleDashed, Loader2 } from 'lucide-react';
import { useWizard, WizardStep } from './CampaignWizardContext';
import { cn } from '../../lib/utils';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Campaign' },
  { id: 2, label: 'Ad sets' },
  { id: 3, label: 'Ads' },
];

export function WizardLayout({ children }: { children: React.ReactNode }) {
  const { draft, step, setStep, saveStatus } = useWizard();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {draft?.name || 'New Campaign'}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              {draft?.client_name ? `${draft.client_name} • ` : ''}
              Draft {draft?.id?.slice(0, 8)}
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isComplete = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : isComplete
                      ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  )}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-mono">
                    {isComplete ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <CircleDashed className="h-3 w-3" />
                    )}
                  </span>
                  {s.label}
                </button>
                {idx < STEPS.length - 1 ? (
                  <span className="h-px w-3 bg-zinc-200 dark:bg-zinc-800" />
                ) : null}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {saveStatus === 'saving' ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              Autosaved
            </span>
          ) : saveStatus === 'error' ? (
            <span className="text-red-500">Save failed</span>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
