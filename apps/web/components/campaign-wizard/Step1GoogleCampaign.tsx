'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useWizard } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const GOOGLE_OBJECTIVES = [
  { value: 'SALES', label: 'Sales', description: 'Drive sales online, in app, by phone, or in store.' },
  { value: 'LEADS', label: 'Leads', description: 'Get leads and other conversions by encouraging customers to take action.' },
  { value: 'WEBSITE_TRAFFIC', label: 'Website traffic', description: 'Get the right people to visit your website.' },
  { value: 'BRAND_AWARENESS', label: 'Brand awareness and reach', description: 'Reach a broad audience and build awareness.' },
];

const CAMPAIGN_TYPES = [
  { value: 'SEARCH', label: 'Search', icon: Search, description: 'Text ads on search results.' },
];

export function Step1GoogleCampaign() {
  const { draft, updateCampaign, updateCampaignPayload, setStep } = useWizard();
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;

  const cp = draft.campaign_payload || {};
  const selectedObjective = cp.objective;
  const selectedType = cp.campaign_type;

  const generateNamingConvention = () => {
    if (!draft.client_name || !selectedObjective || !selectedType) {
      setError('Set client name, objective, and campaign type before generating naming.');
      return;
    }
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).replaceAll('-', '');
    
    updateCampaign({ internal_naming: `${draft.client_name}_${date}_${selectedType}_${selectedObjective}` });
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
    if (!selectedType) {
      setError('Pick a campaign type.');
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
          Set the strategy for your Google Ads campaign.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Naming</CardTitle>
          <CardDescription>How this campaign appears in your dashboard and inside Google Ads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Campaign name"
            placeholder="e.g. Q3 Search Push"
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
              placeholder="e.g. Acme_20260528_SEARCH_LEADS"
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
          <CardDescription>What action should this campaign drive?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            {GOOGLE_OBJECTIVES.map((obj) => {
              const active = selectedObjective === obj.value;
              return (
                <button
                  key={obj.value}
                  onClick={() => updateCampaignPayload({ objective: obj.value })}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-md border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-brand bg-brand/10 dark:bg-brand/10'
                      : 'border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  )}
                >
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
          <CardTitle>Campaign Type</CardTitle>
          <CardDescription>Select where your ads will appear.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              const active = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => updateCampaignPayload({ campaign_type: type.value })}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-md border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-brand bg-brand/10 dark:bg-brand/10'
                      : 'border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900'
                  )}
                >
                  <Icon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">{type.label}</div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{type.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget strategy</CardTitle>
          <CardDescription>
            Set your daily budget for this campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Daily budget (RM)"
            type="number"
            min={1}
            placeholder="e.g. 50"
            value={cp.daily_budget || ''}
            onChange={(e) => updateCampaignPayload({ daily_budget: e.target.value ? Number(e.target.value) : undefined, lifetime_budget: undefined })}
          />
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button onClick={handleNext}>Next: Ad groups</Button>
      </div>
    </div>
  );
}