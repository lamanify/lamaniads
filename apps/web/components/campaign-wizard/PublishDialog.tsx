'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useWizard } from './CampaignWizardContext';
import { Button } from '../ui/Button';

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

export function PublishDialog({ open, onClose, onSuccess }: PublishDialogProps) {
  const { draft, publish } = useWizard();
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState<{ campaign_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open || !draft) return null;

  const adsets = draft.adsets || [];
  const totalAds = adsets.reduce((sum, a) => sum + (a.ads?.length || 0), 0);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const result = await publish();
      setDone({ campaign_id: result.campaign_id });
      setTimeout(() => onSuccess(result.campaign_id), 1500);
    } catch (e: any) {
      setError(e.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Publish to Meta</h2>
          <button onClick={onClose} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Campaign published</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                  Meta ID: {done.campaign_id}
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Created in PAUSED state on Meta. Activate from the campaigns list.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Summary</p>
                <div className="mt-2 space-y-1 text-sm text-zinc-900 dark:text-zinc-50">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Campaign</span>
                    <span className="font-medium truncate ml-4">{draft.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Objective</span>
                    <span className="font-mono text-xs">{draft.campaign_payload?.objective}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Ad sets</span>
                    <span className="font-mono text-xs">{adsets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Ads</span>
                    <span className="font-mono text-xs">{totalAds}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                <p>
                  This will create the campaign, ad sets, creatives and ads on Meta. All assets are created
                  in <span className="text-zinc-700 dark:text-zinc-300 font-medium">PAUSED</span> state. Activate
                  manually after a final review.
                </p>
              </div>

              {error ? (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-500">
                  {error}
                </div>
              ) : null}
            </>
          )}
        </div>

        {!done ? (
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={publishing}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePublish} loading={publishing}>
              {publishing ? 'Publishing...' : 'Publish to Meta'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
