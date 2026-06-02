'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Wand2, Loader2, ExternalLink } from 'lucide-react';
import { useWizard, DraftAd, DraftAdSet } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { campaignsApi } from '../../lib/campaignsApi';

const DEFAULT_GOOGLE_AD_PAYLOAD = {
  format: 'responsive_search_ad',
  headlines: [''],
  descriptions: [''],
  final_urls: ['https://example.com'],
};

export function Step3GoogleAd({ onPublish }: { onPublish: () => void }) {
  const { draft, addAd, updateAd, removeAd, setStep } = useWizard();
  const [activeAdsetId, setActiveAdsetId] = useState<string | null>(null);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;
  const adsets = draft.adsets || [];

  useEffect(() => {
    if (!activeAdsetId && adsets.length > 0) {
      setActiveAdsetId(adsets[0]?.id || null);
    }
  }, [adsets, activeAdsetId]);

  const activeAdset: DraftAdSet | undefined = adsets.find((a) => a.id === activeAdsetId);
  const ads = activeAdset?.ads || [];
  const activeAd: DraftAd | undefined = ads.find((a) => a.id === activeAdId) || ads[0];

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!activeAdId && ads.length > 0) setActiveAdId(ads[0]?.id || null);
  }, [ads, activeAdId]);

  const handleAddAd = async () => {
    if (!activeAdsetId) return;
    const ad = await addAd(activeAdsetId, `Ad ${ads.length + 1}`, DEFAULT_GOOGLE_AD_PAYLOAD);
    setActiveAdId(ad.id || null);
  };

  const handleRemoveAd = async (id: string) => {
    if (!confirm('Remove this ad?')) return;
    await removeAd(id);
    if (activeAdId === id) setActiveAdId(null);
  };

  const updateField = async (patch: any) => {
    if (!activeAd?.id) return;
    const newPayload = { ...activeAd.payload, ...patch };
    await updateAd(activeAd.id, { payload: newPayload });
  };

  const renameActive = async (name: string) => {
    if (!activeAd?.id) return;
    await updateAd(activeAd.id, { name });
  };

  const handleArrayChange = (field: 'headlines' | 'descriptions' | 'final_urls', index: number, value: string) => {
    if (!activeAd?.payload) return;
    const currentArray = activeAd.payload[field] || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    updateField({ [field]: newArray });
  };

  const addArrayItem = (field: 'headlines' | 'descriptions' | 'final_urls') => {
    if (!activeAd?.payload) return;
    const currentArray = activeAd.payload[field] || [];
    updateField({ [field]: [...currentArray, ''] });
  };

  const removeArrayItem = (field: 'headlines' | 'descriptions' | 'final_urls', index: number) => {
    if (!activeAd?.payload) return;
    const currentArray = activeAd.payload[field] || [];
    if (currentArray.length <= 1) return; // Prevent removing last item
    const newArray = currentArray.filter((_: string, i: number) => i !== index);
    updateField({ [field]: newArray });
  };

  const handleGenerateAiCopy = async () => {
    if (!activeAd?.id || !activeAdset) return;
    setIsGenerating(true);
    setError(null);
    try {
      const keywords = (activeAdset.payload?.targeting?.keywords || []).map((k: any) => typeof k === 'string' ? k : k.text);
      const res = await campaignsApi.generateAiCopy(aiPrompt, keywords);
      
      const newPayload = { 
        ...activeAd.payload, 
        headlines: res.headlines.length > 0 ? res.headlines : activeAd.payload?.headlines || [''],
        descriptions: res.descriptions.length > 0 ? res.descriptions : activeAd.payload?.descriptions || ['']
      };
      
      await updateAd(activeAd.id, { payload: newPayload });
      setAiPrompt('');
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI copy. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };


  const handlePublishCheck = () => {
    for (const adset of adsets) {
      if (!adset.ads || adset.ads.length === 0) {
        setError(`Ad group "${adset.name}" has no ads. Add at least one.`);
        return;
      }
      for (const ad of adset.ads) {
        if (!ad.payload?.headlines || ad.payload.headlines.length === 0 || !ad.payload.headlines[0].trim()) {
          setError(`Ad "${ad.name}" needs at least one headline.`);
          return;
        }
        if (!ad.payload?.descriptions || ad.payload.descriptions.length === 0 || !ad.payload.descriptions[0].trim()) {
           setError(`Ad "${ad.name}" needs at least one description.`);
           return;
        }
        if (!ad.payload?.final_urls || ad.payload.final_urls.length === 0 || !ad.payload.final_urls[0].trim()) {
            setError(`Ad "${ad.name}" needs a final URL.`);
            return;
        }
      }
    }
    setError(null);
    onPublish();
  };

  const handlePreview = () => {
    if (!activeAd?.payload) return;
    try {
      window.open(`/preview/google-ad?data=${draft.id}`, '_blank');
    } catch (err) {
      console.error('Failed to open preview', err);
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Ads by ad group
        </h2>
        {adsets.map((adset) => (
          <div key={adset.id} className="space-y-1">
            <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 px-2 truncate">{adset.name}</div>
            {(adset.ads || []).map((ad) => (
              <button
                key={ad.id}
                onClick={() => {
                  setActiveAdsetId(adset.id || null);
                  setActiveAdId(ad.id || null);
                }}
                className={cn(
                  'w-full text-left rounded-md px-3 py-2 transition-colors group',
                  activeAdId === ad.id
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium truncate">{ad.name}</div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ad.id) handleRemoveAd(ad.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {ad.payload?.format === 'responsive_search_ad' ? 'Responsive Search Ad' : 'Ad'}
                </div>
              </button>
            ))}
            {activeAdsetId === adset.id && (
              <Button size="sm" variant="ghost" className="w-full justify-start mt-1 text-zinc-500" onClick={handleAddAd}>
                <Plus className="h-3.5 w-3.5 mr-2" /> Add Ad
              </Button>
            )}
          </div>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ad creative</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Design the ad that users will see.
              </p>
            </div>
          </div>

          {!activeAd ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Select an ad group on the left, then click Add Ad to create creative.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-indigo-500" />
                    <CardTitle>AI Copywriter</CardTitle>
                  </div>
                  <CardDescription>Generate Google Ads headlines and descriptions instantly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeAdset?.payload?.targeting?.keywords && activeAdset.payload.targeting.keywords.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Targeting Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeAdset.payload.targeting.keywords.map((k: any, i: number) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                            {typeof k === 'string' ? k : k.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Describe your product, offer, or unique selling points..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && aiPrompt.trim() && !isGenerating) {
                            e.preventDefault();
                            handleGenerateAiCopy();
                          }
                        }}
                      />
                    </div>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                      onClick={handleGenerateAiCopy}
                      disabled={isGenerating || !aiPrompt.trim()}
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                  <CardDescription>Name this ad internally.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Ad name"
                    value={activeAd.name}
                    onChange={(e) => renameActive(e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Final URL</CardTitle>
                  <CardDescription>Where people go after clicking your ad.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(activeAd.payload?.final_urls || ['']).map((url: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => handleArrayChange('final_urls', idx, e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeArrayItem('final_urls', idx)} disabled={(activeAd.payload?.final_urls || []).length <= 1}>
                         <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => addArrayItem('final_urls')}>Add URL</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Headlines</CardTitle>
                  <CardDescription>Add up to 15 headlines (min 3 recommended).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(activeAd.payload?.headlines || ['']).map((hl: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="E.g. Fast & Reliable Shipping"
                          value={hl}
                          maxLength={30}
                          onChange={(e) => handleArrayChange('headlines', idx, e.target.value)}
                        />
                        <span className="absolute right-3 top-[34px] text-[10px] text-zinc-400 font-mono">
                           {hl.length}/30
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeArrayItem('headlines', idx)} disabled={(activeAd.payload?.headlines || []).length <= 1}>
                         <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => addArrayItem('headlines')} disabled={(activeAd.payload?.headlines || []).length >= 15}>Add Headline</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Descriptions</CardTitle>
                  <CardDescription>Add up to 4 descriptions (min 2 recommended).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(activeAd.payload?.descriptions || ['']).map((desc: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                         <Input
                           placeholder="E.g. Get free shipping on orders over $50."
                           value={desc}
                           maxLength={90}
                           onChange={(e) => handleArrayChange('descriptions', idx, e.target.value)}
                         />
                         <span className="absolute right-3 top-[34px] text-[10px] text-zinc-400 font-mono">
                           {desc.length}/90
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeArrayItem('descriptions', idx)} disabled={(activeAd.payload?.descriptions || []).length <= 1}>
                         <Trash2 className="h-4 w-4 text-zinc-400" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => addArrayItem('descriptions')} disabled={(activeAd.payload?.descriptions || []).length >= 4}>Add Description</Button>
                </CardContent>
              </Card>

              {error ? (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={handlePreview} className="border-zinc-200 dark:border-zinc-700">
                    <ExternalLink className="h-4 w-4 mr-2 text-zinc-500" />
                    Preview Ad
                  </Button>
                  <Button onClick={handlePublishCheck} className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 dark:border-emerald-500">
                    Publish Campaign
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}