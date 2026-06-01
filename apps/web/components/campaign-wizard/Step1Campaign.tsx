'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, MessageCircle, Megaphone, Smartphone, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWizard } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { META_OBJECTIVES, SPECIAL_AD_CATEGORIES } from '@lamani/schemas';
import { cn } from '../../lib/utils';

const OBJECTIVE_ICONS: Record<string, any> = {
  OUTCOME_AWARENESS: Eye,
  OUTCOME_TRAFFIC: ArrowRight,
  OUTCOME_ENGAGEMENT: MessageCircle,
  OUTCOME_LEADS: Megaphone,
  OUTCOME_APP_PROMOTION: Smartphone,
  OUTCOME_SALES: ShoppingBag,
};

export function Step1Campaign() {
  const router = useRouter();
  const { draft, updateCampaign, updateCampaignPayload, setStep } = useWizard();
  const [error, setError] = React.useState<string | null>(null);

  if (!draft) return null;

  const cp = draft.campaign_payload || {};
  const selectedObjective = cp.objective;
  const cboEnabled = cp.cbo_enabled || false;
  const specialCats: string[] = cp.special_ad_categories?.length ? cp.special_ad_categories : ['NONE'];

  const generateNamingConvention = () => {
    if (!draft.client_name || !selectedObjective) {
      setError('Set client name and objective before generating naming.');
      return;
    }
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).replaceAll('-', '');
    const objShort = selectedObjective.replace('OUTCOME_', '');
    updateCampaign({ internal_naming: `${draft.client_name}_${date}_${objShort}` });
    setError(null);
  };

  const handleNext = () => {
    if (!draft.name?.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!selectedObjective) {
      setError('Pick a campaign objective.');
      return;
    }
    setError(null);
    setStep(2);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Campaign details</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Set the strategy: what is this campaign trying to achieve, and what global rules apply.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Naming</CardTitle>
          <CardDescription>How this campaign appears in your dashboard and inside Meta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Campaign name"
            placeholder="e.g. Q3 Lead Gen Push"
            value={draft.name}
            onChange={(e) => updateCampaign({ name: e.target.value })}
          />
          <Input
            label="Client name"
            placeholder="e.g. Acme Co."
            value={draft.client_name || ''}
            onChange={(e) => updateCampaign({ client_name: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <Input
              className="flex-1"
              label="Internal naming convention"
              placeholder="e.g. Acme_20260528_LEADS"
              value={draft.internal_naming || ''}
              onChange={(e) => updateCampaign({ internal_naming: e.target.value })}
            />
            <Button variant="secondary" onClick={generateNamingConvention}>
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objective</CardTitle>
          <CardDescription>What action should this campaign drive on Meta?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {META_OBJECTIVES.map((obj) => {
              const Icon = OBJECTIVE_ICONS[obj.value];
              const active = selectedObjective === obj.value;
              return (
                <button
                  key={obj.value}
                  onClick={() => updateCampaignPayload({ objective: obj.value })}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-md border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900'
                      : 'border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" /> : null}
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{obj.label}</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{obj.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special ad categories</CardTitle>
          <CardDescription>
            Required by Meta for ads in regulated categories (housing, employment, credit, politics).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            label="Category"
            value={specialCats[0] || 'NONE'}
            onChange={(e) => updateCampaignPayload({ special_ad_categories: [e.target.value] })}
            options={SPECIAL_AD_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget strategy</CardTitle>
          <CardDescription>
            Advantage Campaign Budget distributes one budget across ad sets automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={cboEnabled}
              onChange={(e) => updateCampaignPayload({ cbo_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Enable Advantage Campaign Budget (CBO)
          </label>
          {cboEnabled ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Daily budget (cents)"
                type="number"
                min={100}
                placeholder="e.g. 5000"
                value={cp.daily_budget || ''}
                onChange={(e) => updateCampaignPayload({ daily_budget: e.target.value ? Number(e.target.value) : undefined, lifetime_budget: undefined })}
              />
              <Input
                label="Lifetime budget (cents)"
                type="number"
                min={100}
                placeholder="e.g. 50000"
                value={cp.lifetime_budget || ''}
                onChange={(e) => updateCampaignPayload({ lifetime_budget: e.target.value ? Number(e.target.value) : undefined, daily_budget: undefined })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={() => router.push('/campaigns')}>
          Save & exit
        </Button>
        <Button variant="primary" onClick={handleNext}>
          Continue to ad sets
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
