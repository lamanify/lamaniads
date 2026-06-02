'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { campaignsApi } from '../../lib/campaignsApi';

export type WizardStep = 1 | 2 | 3;

export interface DraftAd {
  id?: string;
  adset_id: string;
  position: number;
  name: string;
  payload: any;
}

export interface DraftAdSet {
  id?: string;
  draft_id: string;
  position: number;
  name: string;
  payload: any;
  ads?: DraftAd[];
}

export interface DraftFull {
  id: string;
  org_id: string;
  platform: string;
  platform_account_id: string;
  name: string;
  client_name?: string | null;
  internal_naming?: string | null;
  status: string;
  step: number;
  campaign_payload: any;
  published_campaign_id?: string | null;
  publish_error?: any;
  adsets: DraftAdSet[];
}

interface WizardContextValue {
  draft: DraftFull | null;
  loading: boolean;
  saving: boolean;
  step: WizardStep;
  setStep: (s: WizardStep) => void;
  updateCampaign: (patch: Partial<DraftFull>) => void;
  updateCampaignPayload: (patch: any) => void;
  refreshDraft: () => Promise<void>;
  addAdSet: (name: string, payload: any) => Promise<DraftAdSet>;
  updateAdSet: (adsetId: string, body: any) => Promise<void>;
  removeAdSet: (adsetId: string) => Promise<void>;
  addAd: (adsetId: string, name: string, payload: any) => Promise<DraftAd>;
  updateAd: (adId: string, body: any) => Promise<void>;
  removeAd: (adId: string) => Promise<void>;
  publish: () => Promise<{ success: boolean; campaign_id: string }>;
  uploadMedia: (file: File, kind: 'image' | 'video') => Promise<any>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside CampaignWizardProvider');
  return ctx;
}

interface ProviderProps {
  draftId: string | null;
  platform?: string;
  platformAccountId?: string;
  children: React.ReactNode;
}

export function CampaignWizardProvider({ draftId: initialDraftId, platform, platformAccountId, children }: ProviderProps) {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [draft, setDraft] = useState<DraftFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStepState] = useState<WizardStep>(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSnapshot = useRef<string>('');

  const fetchDraft = useCallback(async (id?: string) => {
    const targetId = id || draftId;
    if (!targetId) return;
    setLoading(true);
    try {
      const data = await campaignsApi.getDraft(targetId);
      setDraft(data);
      lastSavedSnapshot.current = JSON.stringify({
        name: data.name,
        client_name: data.client_name,
        internal_naming: data.internal_naming,
        campaign_payload: data.campaign_payload,
      });
      const apiStep = data.step || 1;
      setStepState((apiStep > 3 ? 3 : apiStep) as WizardStep);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    if (draftId) {
      fetchDraft(draftId);
    } else {
      // For new drafts, instantiate a mock initial draft model matching the platform to bootstrap Step 1 edit viewport immediately instead of staying locked in loading state.
      setDraft({
        id: '',
        org_id: 'a35d1c9d-cf78-44f2-8695-5c032f0ad411',
        platform: platform || 'meta',
        platform_account_id: platformAccountId || '',
        name: 'Untitled campaign',
        status: 'draft',
        step: 1,
        campaign_payload: {},
        adsets: []
      });
      lastSavedSnapshot.current = JSON.stringify({
        name: 'Untitled campaign',
        client_name: '',
        internal_naming: '',
        campaign_payload: {},
      });
      setLoading(false);
    }
  }, [draftId, platform, platformAccountId, fetchDraft]);

  const persistDraft = useCallback(async (currentDraft: DraftFull, currentStep: WizardStep) => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      let id = draftId;
      if (!id) {
        // Create draft if it doesn't exist
        const created = await campaignsApi.createDraft({
          platform_account_id: platformAccountId || '',
          name: (currentDraft.name as string) || 'Untitled campaign',
          platform: (platform as string) || 'meta',
        });
        id = created.id;
        setDraftId(id);
        
        // Immediately update state with the returned draft ID to enable autosaving updates
        setDraft(prev => prev ? { ...prev, id: id as string } : null);
        
        // Update URL to include draft ID
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('draft', id as string);
        window.history.replaceState(null, '', currentUrl.toString());
      }

      await campaignsApi.patchDraft(id as string, {
        name: currentDraft.name || 'Untitled campaign',
        client_name: currentDraft.client_name,
        internal_naming: currentDraft.internal_naming,
        campaign_payload: currentDraft.campaign_payload,
        step: currentStep,
      });
      
      // Load the newly created draft explicitly to populate its initial data structures and turn off loader
      const data = await campaignsApi.getDraft(id as string);
      setDraft(data);
      lastSavedSnapshot.current = JSON.stringify({
        name: data.name,
        client_name: data.client_name,
        internal_naming: data.internal_naming,
        campaign_payload: data.campaign_payload,
      });
      
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [draftId, platform, platformAccountId]);

  useEffect(() => {
    if (!draft) return;

    // Stop persisting auto-saves if the draft doesn't have an ID yet to prevent infinite create loop requests during initialization.
    // If draft has no ID (unsaved newly created mock state), let it skip autosave until user interacts or clicks next.
    if (!draft.id) return;

    const snapshot = JSON.stringify({
      name: draft.name,
      client_name: draft.client_name,
      internal_naming: draft.internal_naming,
      campaign_payload: draft.campaign_payload,
    });
    if (snapshot === lastSavedSnapshot.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistDraft(draft, step);
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, step, persistDraft, draftId]);

  const updateCampaign = (patch: Partial<DraftFull>) => {
    setDraft((prev) => {
      if (prev) return { ...prev, ...patch };
      return {
        name: 'Untitled campaign',
        campaign_payload: {},
        adsets: [],
        ...patch
      } as any;
    });
  };

  const updateCampaignPayload = (patch: any) => {
    setDraft((prev) => {
      const base = prev || { name: 'Untitled campaign', campaign_payload: {}, adsets: [] };
      return { 
        ...base, 
        campaign_payload: { ...(base.campaign_payload || {}), ...patch } 
      } as any;
    });
  };

  const setStep = (s: WizardStep) => {
    setStepState(s);
    if (draft) {
      persistDraft(draft, s);
    }
  };

  const addAdSet = async (name: string, payload: any) => {
    if (!draftId) {
      // Must persist first to get draftId
      await persistDraft(draft || { name: 'Untitled campaign', campaign_payload: {} } as any, step);
    }
    
    // Check again because setDraftId is async
    const id = draftId || (await campaignsApi.listDrafts(platform as string)).find(d => d.name === (draft?.name as string))?.id;

    const adset = await campaignsApi.addAdSet(id as string, {
      name,
      position: draft?.adsets.length || 0,
      payload,
    });
    await fetchDraft(id as string);
    return adset as DraftAdSet;
  };

  const updateAdSet = async (adsetId: string, body: any) => {
    if (!draftId) return;
    // Optimistic update
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adsets: prev.adsets.map((as) => (as.id === adsetId ? { ...as, ...body } : as)),
      };
    });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      setSaveStatus('saving');
      try {
        await campaignsApi.patchAdSet(draftId, adsetId, body);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const removeAdSet = async (adsetId: string) => {
    if (!draftId) return;
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adsets: prev.adsets.filter((as) => as.id !== adsetId),
      };
    });
    await campaignsApi.deleteAdSet(draftId, adsetId);
  };

  const addAd = async (adsetId: string, name: string, payload: any) => {
    if (!draftId) return {} as any;
    const ad = await campaignsApi.addAd(draftId, adsetId, {
      name,
      position: 0,
      payload,
    });
    await fetchDraft(draftId);
    return ad as DraftAd;
  };

  const updateAd = async (adId: string, body: any) => {
    if (!draftId) return;
    // Optimistic update
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adsets: prev.adsets.map((as) => ({
          ...as,
          ads: as.ads?.map((ad) => (ad.id === adId ? { ...ad, ...body } : ad)),
        })),
      };
    });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      setSaveStatus('saving');
      try {
        await campaignsApi.patchAd(draftId, adId, body);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const removeAd = async (adId: string) => {
    if (!draftId) return;
    await campaignsApi.deleteAd(draftId, adId);
    await fetchDraft(draftId);
  };

  const publish = async () => {
    if (!draftId) return { success: false, campaign_id: '' };
    return campaignsApi.publishDraft(draftId);
  };

  const uploadMedia = async (file: File, kind: 'image' | 'video') => {
    if (!draftId) return {} as any;
    return campaignsApi.uploadMedia(draftId, file, kind);
  };

  return (
    <WizardContext.Provider
      value={{
        draft,
        loading,
        saving,
        step,
        setStep,
        updateCampaign,
        updateCampaignPayload,
        refreshDraft: () => fetchDraft(),
        addAdSet,
        updateAdSet,
        removeAdSet,
        addAd,
        updateAd,
        removeAd,
        publish,
        uploadMedia,
        saveStatus,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}
