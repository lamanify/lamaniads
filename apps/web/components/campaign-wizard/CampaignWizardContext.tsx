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
  draftId: string;
  children: React.ReactNode;
}

export function CampaignWizardProvider({ draftId, children }: ProviderProps) {
  const [draft, setDraft] = useState<DraftFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStepState] = useState<WizardStep>(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSnapshot = useRef<string>('');

  const fetchDraft = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campaignsApi.getDraft(draftId);
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
    fetchDraft();
  }, [fetchDraft]);

  const persistDraft = useCallback(async (currentDraft: DraftFull, currentStep: WizardStep) => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      await campaignsApi.patchDraft(draftId, {
        name: currentDraft.name,
        client_name: currentDraft.client_name,
        internal_naming: currentDraft.internal_naming,
        campaign_payload: currentDraft.campaign_payload,
        step: currentStep,
      });
      setSaveStatus('saved');
      lastSavedSnapshot.current = JSON.stringify({
        name: currentDraft.name,
        client_name: currentDraft.client_name,
        internal_naming: currentDraft.internal_naming,
        campaign_payload: currentDraft.campaign_payload,
      });
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [draftId]);

  useEffect(() => {
    if (!draft) return;
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
    }, 5000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, step, persistDraft]);

  const updateCampaign = (patch: Partial<DraftFull>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateCampaignPayload = (patch: any) => {
    setDraft((prev) =>
      prev ? { ...prev, campaign_payload: { ...(prev.campaign_payload || {}), ...patch } } : prev
    );
  };

  const setStep = (s: WizardStep) => {
    setStepState(s);
    if (draft) {
      persistDraft(draft, s);
    }
  };

  const addAdSet = async (name: string, payload: any) => {
    const adset = await campaignsApi.addAdSet(draftId, {
      name,
      position: draft?.adsets.length || 0,
      payload,
    });
    await fetchDraft();
    return adset as DraftAdSet;
  };

  const updateAdSet = async (adsetId: string, body: any) => {
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
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        adsets: prev.adsets.filter((as) => as.id !== adsetId),
      };
    });
    await campaignsApi.deleteAdSet(draftId, adsetId);
    // No fetchDraft needed since we updated locally
  };

  const addAd = async (adsetId: string, name: string, payload: any) => {
    const ad = await campaignsApi.addAd(draftId, adsetId, {
      name,
      position: 0,
      payload,
    });
    // For add, we fetch to get the ID
    await fetchDraft();
    return ad as DraftAd;
  };

  const updateAd = async (adId: string, body: any) => {
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
    await campaignsApi.deleteAd(draftId, adId);
    await fetchDraft();
  };

  const publish = async () => {
    return campaignsApi.publishDraft(draftId);
  };

  const uploadMedia = async (file: File, kind: 'image' | 'video') => {
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
        refreshDraft: fetchDraft,
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
