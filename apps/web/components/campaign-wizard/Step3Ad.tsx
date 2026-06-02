'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { useWizard, DraftAd, DraftAdSet } from './CampaignWizardContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { MediaUpload, UploadedMedia } from '../ui/MediaUpload';
import { campaignsApi } from '../../lib/campaignsApi';
import { CTA_TYPES } from '@lamani/schemas';
import { cn } from '../../lib/utils';

const DEFAULT_AD_PAYLOAD = {
  page_id: '',
  instagram_actor_id: null,
  format: 'single_image',
  primary_text: '',
  headline: '',
  description: '',
  cta_type: 'LEARN_MORE',
  destination_url: 'https://example.com',
  media: [] as UploadedMedia[],
};



export function Step3Ad({ onPublish }: { onPublish: () => void }) {
  const { draft, addAd, updateAd, removeAd, setStep, uploadMedia } = useWizard();
  const [activeAdsetId, setActiveAdsetId] = useState<string | null>(null);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
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

  useEffect(() => {
    if (!activeAdId && ads.length > 0) setActiveAdId(ads[0]?.id || null);
  }, [ads, activeAdId]);

  useEffect(() => {
    let cancelled = false;
    campaignsApi
      .listMetaPages(draft.platform_account_id)
      .then((p) => {
        if (!cancelled) {
          setPages(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load Facebook Pages');
      });
    return () => {
      cancelled = true;
    };
  }, [draft.platform_account_id]);

  useEffect(() => {
    if (!activeAd?.payload?.page_id) return;
    let cancelled = false;
    campaignsApi
      .listInstagramAccounts(activeAd.payload.page_id)
      .then((ig) => {
        if (!cancelled) {
          setIgAccounts(ig);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setIgAccounts([]);
          setError(e.message || 'Failed to load Instagram accounts');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeAd?.payload?.page_id]);

  const handleAddAd = async () => {
    if (!activeAdsetId) return;
    const ad = await addAd(activeAdsetId, `Ad ${ads.length + 1}`, DEFAULT_AD_PAYLOAD);
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

  const onUpload = async (file: File, kind: 'image' | 'video'): Promise<UploadedMedia> => {
    const res = await uploadMedia(file, kind);
    const media: UploadedMedia = {
      kind,
      hash: res.hash,
      video_id: res.video_id,
      url: res.url,
    };
    if (activeAd?.id) {
      const newMedia = [...(activeAd.payload?.media || []), media];
      await updateField({ media: newMedia });
    }
    return media;
  };

  const onRemoveMedia = async (idx: number) => {
    if (!activeAd?.id) return;
    const newMedia = (activeAd.payload?.media || []).filter((_: any, i: number) => i !== idx);
    await updateField({ media: newMedia });
  };

  const handlePublishCheck = () => {
    for (const adset of adsets) {
      if (!adset.ads || adset.ads.length === 0) {
        setError(`Ad set "${adset.name}" has no ads. Add at least one.`);
        return;
      }
      for (const ad of adset.ads) {
        if (!ad.payload?.page_id) {
          setError(`Ad "${ad.name}" needs a Facebook Page.`);
          return;
        }
        if (!ad.payload?.media || ad.payload.media.length === 0) {
          setError(`Ad "${ad.name}" needs media.`);
          return;
        }
        if (!ad.payload?.primary_text || !ad.payload?.headline) {
          setError(`Ad "${ad.name}" needs primary text and headline.`);
          return;
        }
      }
    }
    setError(null);
    onPublish();
  };

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Ads by ad set
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
                  {ad.payload?.format || '—'}
                </div>
              </button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setActiveAdsetId(adset.id || null);
                handleAddAd();
              }}
              className="w-full justify-start"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add ad
            </Button>
          </div>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ads</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              The exact creative people will see. Identity, format, copy and destination.
            </p>
          </div>

          {!activeAd ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Pick an ad set on the left and add an ad.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                  <CardDescription>The Facebook Page and Instagram account this ad runs from.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input label="Ad name" value={activeAd.name} onChange={(e) => renameActive(e.target.value)} />
                  <Select
                    label="Facebook Page"
                    value={activeAd.payload?.page_id || ''}
                    onChange={(e) => updateField({ page_id: e.target.value })}
                    options={[
                      { value: '', label: 'Select page...' },
                      ...pages.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                  <Select
                    label="Instagram account"
                    value={activeAd.payload?.instagram_actor_id || ''}
                    onChange={(e) => updateField({ instagram_actor_id: e.target.value || null })}
                    options={[
                      { value: '', label: 'Use Page only' },
                      ...igAccounts.map((ig) => ({ value: ig.id, label: `@${ig.username}` })),
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Format & media</CardTitle>
                  <CardDescription>Pick a format and upload media. Files upload directly to Meta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {(['single_image', 'single_video', 'carousel'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => updateField({ format: f })}
                        className={cn(
                          'inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                          activeAd.payload?.format === f
                            ? 'border-brand bg-brand text-white'
                            : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900'
                        )}
                      >
                        {f.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <MediaUpload
                    label="Upload media"
                    value={activeAd.payload?.media || []}
                    onUpload={onUpload}
                    onRemove={onRemoveMedia}
                    multiple={activeAd.payload?.format === 'carousel'}
                    accept={activeAd.payload?.format === 'single_video' ? 'video/*' : 'image/*'}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Copy</CardTitle>
                  <CardDescription>Primary text shows above. Headline and description show under media.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    label="Primary text"
                    placeholder="Tell people what makes this offer special..."
                    rows={4}
                    maxLength={2200}
                    value={activeAd.payload?.primary_text || ''}
                    onChange={(e) => updateField({ primary_text: e.target.value })}
                  />
                  <Input
                    label="Headline"
                    placeholder="Limit 40 chars for best display"
                    maxLength={40}
                    value={activeAd.payload?.headline || ''}
                    onChange={(e) => updateField({ headline: e.target.value })}
                  />
                  <Input
                    label="Description"
                    placeholder="Optional supporting line"
                    maxLength={125}
                    value={activeAd.payload?.description || ''}
                    onChange={(e) => updateField({ description: e.target.value })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Destination & CTA</CardTitle>
                  <CardDescription>Where the click leads, and what button to show.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="Call to action"
                    value={activeAd.payload?.cta_type || 'LEARN_MORE'}
                    onChange={(e) => updateField({ cta_type: e.target.value })}
                    options={CTA_TYPES.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }))}
                  />
                  <Input
                    label="Destination URL"
                    placeholder="https://yoursite.com/landing"
                    type="url"
                    value={activeAd.payload?.destination_url || ''}
                    onChange={(e) => updateField({ destination_url: e.target.value })}
                  />
                  <Input
                    label="URL parameters (UTM)"
                    placeholder="utm_source=meta&utm_campaign=..."
                    value={activeAd.payload?.url_tags || ''}
                    onChange={(e) => updateField({ url_tags: e.target.value })}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {error ? (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-4">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to ad sets
            </Button>
            <Button variant="primary" onClick={handlePublishCheck}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Review & publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
