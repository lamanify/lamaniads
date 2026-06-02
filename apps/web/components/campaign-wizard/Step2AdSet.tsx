'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useWizard } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Combobox } from '../ui/Combobox';
import { campaignsApi } from '../../lib/campaignsApi';
import {
  OPTIMIZATION_GOALS_BY_OBJECTIVE,
  CONVERSION_LOCATIONS_BY_OBJECTIVE,
  BILLING_EVENTS,
} from '@lamani/schemas';
import { cn } from '../../lib/utils';

interface Step2AdSetProps {}

const getKLTime = () => {
  const d = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d).replace(' ', 'T');
};

const DEFAULT_ADSET_PAYLOAD = {
  conversion_location: 'website',
  optimization_goal: 'IMPRESSIONS',
  billing_event: 'IMPRESSIONS',
  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  daily_budget: 1000,
  targeting: {
    geo_locations: { countries: ['MY'], regions: [], cities: [] },
    age_min: 18,
    age_max: 65,
    genders: [],
    interests: [],
    custom_audiences: [],
    excluded_custom_audiences: [],
    publisher_platforms: ['facebook', 'instagram'],
  },
  start_time: getKLTime(),
};

export function Step2AdSet({}: Step2AdSetProps) {
  const { draft, addAdSet, updateAdSet, removeAdSet, setStep } = useWizard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (!draft) return null;
  const adsets = draft.adsets || [];
  const objective: string = draft.campaign_payload?.objective || 'OUTCOME_TRAFFIC';
  const cboEnabled: boolean = draft.campaign_payload?.cbo_enabled || false;

  const active = adsets.find((a) => a.id === activeId) || adsets[0];
  useEffect(() => {
    if (!activeId && adsets.length > 0) setActiveId(adsets[0]?.id || null);
  }, [adsets, activeId]);

  const optimizationGoals = OPTIMIZATION_GOALS_BY_OBJECTIVE[objective] || ['IMPRESSIONS', 'REACH', 'LINK_CLICKS'];
  const conversionLocations = CONVERSION_LOCATIONS_BY_OBJECTIVE[objective] || [
    { value: 'website', label: 'Website' },
    { value: 'app', label: 'App' },
    { value: 'messenger', label: 'Messenger' },
  ];

  const handleAdd = async () => {
    setCreating(true);
    try {
      const ads = await addAdSet(`Ad Set ${adsets.length + 1}`, DEFAULT_ADSET_PAYLOAD);
      setActiveId(ads.id || null);
    } catch (e: any) {
      setError(e.message || 'Failed to add ad set');
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this ad set?')) return;
    await removeAdSet(id);
    if (activeId === id) setActiveId(null);
  };

  const updateActiveField = async (patch: any) => {
    if (!active?.id) return;
    const newPayload = { ...active.payload, ...patch };
    await updateAdSet(active.id, { payload: newPayload });
  };

  const updateActiveTargeting = async (patch: any) => {
    if (!active?.id) return;
    const newTargeting = { ...(active.payload?.targeting || {}), ...patch };
    const newPayload = { ...active.payload, targeting: newTargeting };
    await updateAdSet(active.id, { payload: newPayload });
  };

  const renameActive = async (name: string) => {
    if (!active?.id) return;
    await updateAdSet(active.id, { name });
  };

  const handleNext = () => {
    if (adsets.length === 0) {
      setError('Add at least one ad set.');
      return;
    }
    setError(null);
    setStep(3);
  };

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Ad sets
          </h2>
          <Button size="sm" variant="ghost" onClick={handleAdd} loading={creating}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {adsets.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-3 py-4 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            No ad sets yet
          </p>
        ) : (
          adsets.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id || null)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 transition-colors group',
                active?.id === a.id
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium truncate">{a.name}</div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (a.id) handleRemove(a.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                {a.payload?.optimization_goal || '—'} • {a.ads?.length || 0} ads
              </div>
            </button>
          ))
        )}
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ad set configuration</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Who should see this, where it should run, and how much should be spent.
              </p>
            </div>
          </div>

          {!active ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add your first ad set to configure audience and budget.
                </p>
                <Button variant="primary" onClick={handleAdd} loading={creating} className="mt-3">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add ad set
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Identity & goal</CardTitle>
                  <CardDescription>Name this ad set and set its optimization goal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Ad set name"
                    value={active.name}
                    onChange={(e) => renameActive(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Conversion location"
                      value={active.payload?.conversion_location || 'website'}
                      onChange={(e) => updateActiveField({ conversion_location: e.target.value })}
                      options={conversionLocations}
                    />
                    <Select
                      label="Optimization goal"
                      value={active.payload?.optimization_goal || 'IMPRESSIONS'}
                      onChange={(e) => updateActiveField({ optimization_goal: e.target.value })}
                      options={optimizationGoals.map((g) => ({ value: g, label: g.replaceAll('_', ' ') }))}
                    />
                  </div>
                  <Select
                    label="Billing event"
                    value={active.payload?.billing_event || 'IMPRESSIONS'}
                    onChange={(e) => updateActiveField({ billing_event: e.target.value })}
                    options={BILLING_EVENTS.map((b) => ({ value: b.value, label: b.label }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audience</CardTitle>
                  <CardDescription>Define geo, age, gender and interests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Combobox
                    label="Locations (countries / regions / cities)"
                    placeholder="Search Malaysia, Kuala Lumpur, etc..."
                    selected={(active.payload?.targeting?.geo_locations?.countries || []).map((k: string) => ({
                      id: k,
                      name: k,
                    }))}
                    onSelect={(opt) => {
                      const current = active.payload?.targeting?.geo_locations?.countries || [];
                      updateActiveTargeting({
                        geo_locations: {
                          ...(active.payload?.targeting?.geo_locations || {}),
                          countries: [...current, opt.id],
                        },
                      });
                    }}
                    onRemove={(id) => {
                      const current = active.payload?.targeting?.geo_locations?.countries || [];
                      updateActiveTargeting({
                        geo_locations: {
                          ...(active.payload?.targeting?.geo_locations || {}),
                          countries: current.filter((c: string) => c !== id),
                        },
                      });
                    }}
                    onSearch={async (q) => {
                      const r = await campaignsApi.searchTargeting(q, 'country');
                      return r.map((x: any) => ({ id: x.country_code || x.key, name: x.name, meta: x.type }));
                    }}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Min age"
                      type="number"
                      min={13}
                      max={65}
                      value={active.payload?.targeting?.age_min ?? 18}
                      onChange={(e) => updateActiveTargeting({ age_min: Number(e.target.value) })}
                    />
                    <Input
                      label="Max age"
                      type="number"
                      min={13}
                      max={65}
                      value={active.payload?.targeting?.age_max ?? 65}
                      onChange={(e) => updateActiveTargeting({ age_max: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Gender</label>
                    <div className="flex gap-2">
                      {[
                        { value: 0, label: 'All' },
                        { value: 1, label: 'Men' },
                        { value: 2, label: 'Women' },
                      ].map((g) => {
                        const genders: number[] = active.payload?.targeting?.genders || [];
                        const isAll = genders.length === 0;
                        const isActive =
                          (g.value === 0 && isAll) || genders.includes(g.value);
                        return (
                          <button
                            key={g.value}
                            onClick={() => {
                              if (g.value === 0) updateActiveTargeting({ genders: [] });
                              else updateActiveTargeting({ genders: [g.value] });
                            }}
                            className={cn(
                              'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                              isActive
                                ? 'border-brand bg-brand text-white'
                                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
                            )}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Combobox
                    label="Detailed targeting (interests)"
                    placeholder="Search interests..."
                    selected={active.payload?.targeting?.interests || []}
                    onSelect={(opt) => {
                      const current = active.payload?.targeting?.interests || [];
                      updateActiveTargeting({ interests: [...current, opt] });
                    }}
                    onRemove={(id) => {
                      const current = active.payload?.targeting?.interests || [];
                      updateActiveTargeting({ interests: current.filter((c: any) => c.id !== id) });
                    }}
                    onSearch={async (q) => {
                      const r = await campaignsApi.searchInterests(q);
                      return r.map((x: any) => ({
                        id: x.id,
                        name: x.name,
                        meta: x.size_min ? `${x.size_min.toLocaleString()}+` : undefined,
                      }));
                    }}
                  />
                  <Combobox
                    label="Custom audiences"
                    placeholder="Search custom audiences..."
                    selected={active.payload?.targeting?.custom_audiences || []}
                    onSelect={(opt) => {
                      const current = active.payload?.targeting?.custom_audiences || [];
                      updateActiveTargeting({ custom_audiences: [...current, opt] });
                    }}
                    onRemove={(id) => {
                      const current = active.payload?.targeting?.custom_audiences || [];
                      updateActiveTargeting({ custom_audiences: current.filter((c: any) => c.id !== id) });
                    }}
                    onSearch={async (q) => {
                      const r = await campaignsApi.listCustomAudiences(draft.platform_account_id);
                      return r
                        .filter((x: any) => x.name.toLowerCase().includes(q.toLowerCase()))
                        .map((x: any) => ({ id: x.id, name: x.name, meta: x.subtype }));
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Placements</CardTitle>
                  <CardDescription>Where your ads run on Meta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['facebook', 'instagram', 'audience_network', 'messenger'] as const).map((p) => {
                    const platforms: string[] = active.payload?.targeting?.publisher_platforms || [];
                    const checked = platforms.includes(p);
                    return (
                      <label key={p} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newList = e.target.checked
                              ? [...platforms, p]
                              : platforms.filter((x) => x !== p);
                            updateActiveTargeting({ publisher_platforms: newList });
                          }}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                        <span className="capitalize">{p.replaceAll('_', ' ')}</span>
                      </label>
                    );
                  })}
                </CardContent>
              </Card>

              {!cboEnabled ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Budget & schedule</CardTitle>
                    <CardDescription>Set how much to spend and when this ad set runs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Daily budget (RM)"
                        type="number"
                        min={100}
                        value={active.payload?.daily_budget || ''}
                        onChange={(e) =>
                          updateActiveField({
                            daily_budget: e.target.value ? Number(e.target.value) : undefined,
                            lifetime_budget: undefined,
                          })
                        }
                      />
                      <Input
                        label="Lifetime budget (RM)"
                        type="number"
                        min={100}
                        value={active.payload?.lifetime_budget || ''}
                        onChange={(e) =>
                          updateActiveField({
                            lifetime_budget: e.target.value ? Number(e.target.value) : undefined,
                            daily_budget: undefined,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Start time"
                        type="datetime-local"
                        value={(active.payload?.start_time || '').slice(0, 16)}
                        onChange={(e) => updateActiveField({ start_time: e.target.value })}
                      />
                      <Input
                        label="End time (optional)"
                        type="datetime-local"
                        value={(active.payload?.end_time || '').slice(0, 16)}
                        onChange={(e) => updateActiveField({ end_time: e.target.value || null })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule</CardTitle>
                    <CardDescription>
                      Budget is managed at campaign level (CBO). Set delivery window for this ad set.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Start time"
                        type="datetime-local"
                        value={(active.payload?.start_time || '').slice(0, 16)}
                        onChange={(e) => updateActiveField({ start_time: e.target.value })}
                      />
                      <Input
                        label="End time (optional)"
                        type="datetime-local"
                        value={(active.payload?.end_time || '').slice(0, 16)}
                        onChange={(e) => updateActiveField({ end_time: e.target.value || null })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {error ? (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button variant="primary" onClick={handleNext}>
              Continue to ads
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
