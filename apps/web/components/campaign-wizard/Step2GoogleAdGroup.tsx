'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useWizard } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { campaignsApi } from '../../lib/campaignsApi';
import { Combobox } from '../ui/Combobox';

const DEFAULT_ADGROUP_PAYLOAD = {
  optimization_goal: 'MAXIMIZE_CONVERSIONS',
  bid_strategy: 'MAXIMIZE_CONVERSIONS',
  bid_amount: 1, // Optional: Target CPA or Target ROAS depending on strategy
  targeting: {
    geo_locations: { countries: ['US'], regions: [], cities: [] },
    languages: [{ id: '1000', name: 'English' }],
    keywords: [],
    custom_audiences: [],
    excluded_custom_audiences: [],
    publisher_platforms: ['google_search'],
  },
};

export function Step2GoogleAdGroup() {
  const { draft, addAdSet, updateAdSet, removeAdSet, setStep } = useWizard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');

  if (!draft) return null;
  const adsets = draft.adsets || [];

  const active = adsets.find((a) => a.id === activeId) || adsets[0];
  useEffect(() => {
    if (!activeId && adsets.length > 0) setActiveId(adsets[0]?.id || null);
  }, [adsets, activeId]);

  const handleAdd = async () => {
    setCreating(true);
    try {
      const ads = await addAdSet(`Ad Group ${adsets.length + 1}`, DEFAULT_ADGROUP_PAYLOAD);
      setActiveId(ads.id || null);
    } catch (e: any) {
      setError(e.message || 'Failed to add ad group');
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this ad group?')) return;
    await removeAdSet(id);
    if (activeId === id) setActiveId(null);
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

  const handleAddKeyword = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput) {
      e.preventDefault();
      const text = keywordInput.trim();
      if (!text) return;
      
      const currentKeywords = active?.payload?.targeting?.keywords || [];
      const newKeywords = [...currentKeywords, { text, match_type: 'BROAD' }];
      await updateActiveTargeting({ keywords: newKeywords });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = async (index: number) => {
    const currentKeywords = active?.payload?.targeting?.keywords || [];
    const newKeywords = currentKeywords.filter((_: any, i: number) => i !== index);
    await updateActiveTargeting({ keywords: newKeywords });
  };

  const handleNext = () => {
    if (adsets.length === 0) {
      setError('Add at least one ad group.');
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
            Ad Groups
          </h2>
          <Button size="sm" variant="ghost" onClick={handleAdd} loading={creating}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {adsets.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-3 py-4 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            No ad groups yet
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
                {a.payload?.targeting?.keywords?.length || 0} keywords • {a.ads?.length || 0} ads
              </div>
            </button>
          ))
        )}
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ad group configuration</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Set up targeting and keywords for this ad group.
              </p>
            </div>
          </div>

          {!active ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add your first ad group to configure targeting and keywords.
                </p>
                <Button variant="primary" onClick={handleAdd} loading={creating} className="mt-3">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add ad group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                  <CardDescription>Name this ad group.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Ad group name"
                    value={active.name}
                    onChange={(e) => renameActive(e.target.value)}
                  />
                </CardContent>
              </Card>

              {draft.campaign_payload?.campaign_type === 'SEARCH' || draft.campaign_payload?.campaign_type === 'PERFORMANCE_MAX' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Keywords</CardTitle>
                    <CardDescription>Target specific search terms.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Add keyword"
                      placeholder="Type a keyword and press Enter"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                    />
                    <div className="flex flex-wrap gap-2">
                      {active.payload?.targeting?.keywords?.map((kw: any, index: number) => (
                        <div key={index} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1 rounded-md text-sm">
                          <span>{kw.text}</span>
                          <button onClick={() => handleRemoveKeyword(index)} className="text-zinc-500 hover:text-red-500 ml-1">
                            &times;
                          </button>
                        </div>
                      ))}
                      {(!active.payload?.targeting?.keywords || active.payload?.targeting?.keywords?.length === 0) && (
                         <span className="text-sm text-zinc-500">No keywords added yet.</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Locations</CardTitle>
                  <CardDescription>Select locations for this campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="locationSelection"
                        checked={
                          active.payload?.targeting?.geo_locations?.custom_selected !== true &&
                          (!active.payload?.targeting?.geo_locations?.countries ||
                            active.payload.targeting.geo_locations.countries.length === 0 ||
                            (active.payload.targeting.geo_locations.countries.length === 1 && active.payload.targeting.geo_locations.countries[0] === 'ALL')) &&
                          (!active.payload?.targeting?.geo_locations?.regions || active.payload.targeting.geo_locations.regions.length === 0) &&
                          (!active.payload?.targeting?.geo_locations?.cities || active.payload.targeting.geo_locations.cities.length === 0)
                        }
                        onChange={() => {
                          updateActiveTargeting({
                            geo_locations: { countries: ['ALL'], regions: [], cities: [], custom_selected: false }
                          });
                        }}
                        className="h-4.5 w-4.5 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:ring-zinc-50"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        All countries and territories
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="locationSelection"
                        checked={
                          active.payload?.targeting?.geo_locations?.custom_selected !== true &&
                          active.payload?.targeting?.geo_locations?.countries?.length === 1 &&
                          active.payload.targeting.geo_locations.countries[0] === 'MY' &&
                          (!active.payload?.targeting?.geo_locations?.regions || active.payload.targeting.geo_locations.regions.length === 0) &&
                          (!active.payload?.targeting?.geo_locations?.cities || active.payload.targeting.geo_locations.cities.length === 0)
                        }
                        onChange={() => {
                          updateActiveTargeting({
                            geo_locations: { countries: ['MY'], regions: [], cities: [], custom_selected: false }
                          });
                        }}
                        className="h-4.5 w-4.5 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:ring-zinc-50"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Malaysia
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="locationSelection"
                        checked={
                          active.payload?.targeting?.geo_locations?.custom_selected === true
                        }
                        onChange={() => {
                          updateActiveTargeting({
                            geo_locations: { countries: [], regions: [], cities: [], custom_selected: true }
                          });
                        }}
                        className="h-4.5 w-4.5 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:ring-zinc-50"
                      />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Custom locations
                      </span>
                    </label>
                  </div>

                  {active.payload?.targeting?.geo_locations?.custom_selected === true && (
                    <div className="pt-2 pl-7 space-y-4">
                      <Combobox
                        label="Locations"
                        placeholder="Search locations to include..."
                        selected={[]}
                        onSelect={(opt) => {
                          const currentGeo = active.payload?.targeting?.geo_locations || { countries: [], regions: [], cities: [] };
                          const parts = opt.id.split(':');
                          const type = parts[0];
                          const name = opt.name; // Keep full specific location name

                          if (type === 'country') {
                            const countries = [...(currentGeo.countries || []).filter((c: string) => c !== 'ALL' && c !== 'MY'), name];
                            updateActiveTargeting({ geo_locations: { ...currentGeo, countries } });
                          } else if (type === 'region') {
                            const regions = [...(currentGeo.regions || []), name];
                            updateActiveTargeting({ geo_locations: { ...currentGeo, regions } });
                          } else if (type === 'city') {
                            const cities = [...(currentGeo.cities || []), name];
                            updateActiveTargeting({ geo_locations: { ...currentGeo, cities } });
                          }
                        }}
                        onRemove={() => {}}
                        onSearch={async (q) => {
                          const r = draft?.platform_account_id 
                            ? await campaignsApi.searchGoogleTargeting(q, draft.platform_account_id)
                            : await campaignsApi.searchTargeting(q, 'city');
                          
                          // Filter out results with duplicate keys
                          const seenIds = new Set();
                          
                          return r.reduce((acc: any[], x: any) => {
                            const id = `${x.type || 'city'}:${x.key || x.country_code || Math.random().toString(36).substring(7)}`;
                            
                            if (!seenIds.has(id)) {
                              seenIds.add(id);
                              const locationParts = [x.name];
                              if (x.region) locationParts.push(x.region);
                              if (x.country_name) locationParts.push(x.country_name);
                              
                              acc.push({
                                id,
                                name: locationParts.join(', '),
                                meta: `${x.type || 'city'}${x.audience_size ? ` (Reach: ${x.audience_size.toLocaleString()})` : ''}`
                              });
                            }
                            return acc;
                          }, []);
                        }}
                      />

                      {/* Display selected custom locations below the input field */}
                      {((active.payload?.targeting?.geo_locations?.countries || []).filter((c: string) => c !== 'ALL' && c !== 'MY').length > 0 ||
                        (active.payload?.targeting?.geo_locations?.regions || []).length > 0 ||
                        (active.payload?.targeting?.geo_locations?.cities || []).length > 0) && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {[
                            ...(active.payload?.targeting?.geo_locations?.countries || [])
                              .filter((c: string) => c !== 'ALL' && c !== 'MY')
                              .map((c: string) => ({ id: `country:${c}`, name: c, type: 'country' })),
                            ...(active.payload?.targeting?.geo_locations?.regions || [])
                              .map((r: string) => ({ id: `region:${r}`, name: r, type: 'region' })),
                            ...(active.payload?.targeting?.geo_locations?.cities || [])
                              .map((c: string) => ({ id: `city:${c}`, name: c, type: 'city' }))
                          ].map((loc) => (
                            <div
                              key={loc.id}
                              className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1 rounded-md text-sm border border-zinc-200 dark:border-zinc-700"
                            >
                              <span>{loc.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentGeo = active.payload?.targeting?.geo_locations || { countries: [], regions: [], cities: [] };
                                  if (loc.type === 'country') {
                                    const countries = (currentGeo.countries || []).filter((c: string) => c !== loc.name);
                                    updateActiveTargeting({ geo_locations: { ...currentGeo, countries } });
                                  } else if (loc.type === 'region') {
                                    const regions = (currentGeo.regions || []).filter((r: string) => r !== loc.name);
                                    updateActiveTargeting({ geo_locations: { ...currentGeo, regions } });
                                  } else if (loc.type === 'city') {
                                    const cities = (currentGeo.cities || []).filter((c: string) => c !== loc.name);
                                    updateActiveTargeting({ geo_locations: { ...currentGeo, cities } });
                                  }
                                }}
                                className="text-zinc-400 hover:text-red-500 font-semibold text-xs ml-1"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {error ? (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Next: Ads <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}