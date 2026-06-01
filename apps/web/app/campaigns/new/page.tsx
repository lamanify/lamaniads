'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { campaignsApi } from '../../../lib/campaignsApi';
import { CampaignWizardProvider, useWizard } from '../../../components/campaign-wizard/CampaignWizardContext';
import { WizardLayout } from '../../../components/campaign-wizard/WizardLayout';
import { Step1Campaign } from '../../../components/campaign-wizard/Step1Campaign';
import { Step2AdSet } from '../../../components/campaign-wizard/Step2AdSet';
import { Step3Ad } from '../../../components/campaign-wizard/Step3Ad';
import { PublishDialog } from '../../../components/campaign-wizard/PublishDialog';

export const dynamic = 'force-dynamic';

function WizardContent() {
  const { step, draft, loading } = useWizard();
  const [showPublish, setShowPublish] = useState(false);
  const router = useRouter();

  if (loading || !draft) {
    return (
      <WizardLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout>
      {step === 1 ? <Step1Campaign /> : null}
      {step === 2 ? <Step2AdSet /> : null}
      {step === 3 ? <Step3Ad onPublish={() => setShowPublish(true)} /> : null}
      <PublishDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        onSuccess={() => {
          setShowPublish(false);
          router.push('/campaigns');
        }}
      />
    </WizardLayout>
  );
}

function NewCampaignBootstrap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams?.get('draft') || null;
  const accountIdParam = searchParams?.get('account_id') || null;
  const [draftId, setDraftId] = useState<string | null>(draftIdParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draftId) return;
    if (!accountIdParam) {
      setError('Missing account_id. Open the wizard from the campaigns page.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const created = await campaignsApi.createDraft({
          platform_account_id: accountIdParam,
          name: 'Untitled campaign',
        });
        if (!cancelled) {
          const newUrl = `/campaigns/new?draft=${created.id}`;
          router.replace(newUrl);
          setDraftId(created.id);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to create draft');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, accountIdParam, router]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            Back to campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!draftId) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 dark">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <CampaignWizardProvider draftId={draftId}>
      <WizardContent />
    </CampaignWizardProvider>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 dark">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      }
    >
      <NewCampaignBootstrap />
    </Suspense>
  );
}
