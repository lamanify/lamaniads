const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type LiveAccount = {
  platform_account_id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
};

type LiveCampaign = {
  platform: string;
  platform_campaign_id: string;
  name: string;
  status: string;
  budget_amount: number;
  currency: string;
  native_payload_json: Record<string, any>;
  normalized_payload_json: {
    objective?: string;
    buying_type?: string;
    start_time?: string;
    stop_time?: string;
  };
};

type LiveAdSet = {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: Record<string, any>;
  optimization_goal?: string;
  billing_event?: string;
  bid_amount?: number;
  start_time?: string;
  end_time?: string;
};

type LiveAd = {
  id: string;
  name: string;
  status: string;
  creative?: Record<string, any>;
  effective_status?: string;
};

type LiveInsights = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  frequency: number;
  leads: number;
  conversion_rate: number;
  cost_per_lead: number;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev',
      'X-Org-Id': 'a35d1c9d-cf78-44f2-8695-5c032f0ad411',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json();
}

export const campaignsApi = {
  listLiveAccounts: (nameFilter?: string) =>
    api<LiveAccount[]>(`/campaigns/live/accounts${nameFilter ? `?name_filter=${encodeURIComponent(nameFilter)}` : ''}`),

  listLiveCampaigns: (accountId: string) =>
    api<LiveCampaign[]>(`/campaigns/live?account_id=${encodeURIComponent(accountId)}`),

  getAllCampaignInsights: (accountId: string, datePreset = 'last_30d') =>
    api<Record<string, LiveInsights>>(
      `/campaigns/live/accounts/${encodeURIComponent(accountId)}/campaign-insights?date_preset=${datePreset}`,
    ),

  getLiveInsights: (campaignId: string, accountId: string, datePreset = 'last_30d') =>
    api<LiveInsights>(
      `/campaigns/live/${campaignId}/insights?account_id=${encodeURIComponent(accountId)}&date_preset=${datePreset}`,
    ),

  listLiveAdSets: (campaignId: string) =>
    api<LiveAdSet[]>(`/campaigns/live/${campaignId}/adsets`),

  listLiveAds: (adsetId: string) =>
    api<LiveAd[]>(`/campaigns/live/adsets/${adsetId}/ads`),

  updateStatus: (campaignId: string, status: 'active' | 'paused') =>
    api<{ success: boolean }>(`/campaigns/live/${campaignId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  updateBudget: (campaignId: string, payload: { daily_budget?: number; lifetime_budget?: number }) =>
    api<{ success: boolean }>(`/campaigns/live/${campaignId}/budget`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listMetaPages: (accountId?: string) =>
    api<any[]>(`/campaigns/meta/pages${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ''}`),

  listInstagramAccounts: (pageId: string) =>
    api<any[]>(`/campaigns/meta/pages/${pageId}/instagram-accounts`),

  listCustomAudiences: (accountId: string) =>
    api<any[]>(`/campaigns/meta/accounts/${accountId}/custom-audiences`),

  searchTargeting: (q: string, type = 'country') =>
    api<any[]>(`/campaigns/meta/targeting/search?q=${encodeURIComponent(q)}&type=${type}`),

  searchInterests: (q: string) =>
    api<any[]>(`/campaigns/meta/targeting/interests?q=${encodeURIComponent(q)}`),

  createDraft: (body: { platform_account_id: string; name: string; client_name?: string; internal_naming?: string }) =>
    api<any>('/campaigns/drafts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listDrafts: () =>
    api<any[]>('/campaigns/drafts'),

  getDraft: (id: string) =>
    api<any>(`/campaigns/drafts/${id}`),

  patchDraft: (id: string, body: any) =>
    api<any>(`/campaigns/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteDraft: (id: string) =>
    api<{ success: boolean }>(`/campaigns/drafts/${id}`, {
      method: 'DELETE',
    }),

  addAdSet: (draftId: string, body: any) =>
    api<any>(`/campaigns/drafts/${draftId}/adsets`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patchAdSet: (draftId: string, adsetId: string, body: any) =>
    api<any>(`/campaigns/drafts/${draftId}/adsets/${adsetId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteAdSet: (draftId: string, adsetId: string) =>
    api<{ success: boolean }>(`/campaigns/drafts/${draftId}/adsets/${adsetId}`, {
      method: 'DELETE',
    }),

  addAd: (draftId: string, adset_id: string, body: any) =>
    api<any>(`/campaigns/drafts/${draftId}/adsets/${adset_id}/ads`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patchAd: (draftId: string, adId: string, body: any) =>
    api<any>(`/campaigns/drafts/${draftId}/ads/${adId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteAd: (draftId: string, adId: string) =>
    api<{ success: boolean }>(`/campaigns/drafts/${draftId}/ads/${adId}`, {
      method: 'DELETE',
    }),

  uploadMedia: async (draftId: string, file: File, kind: 'image' | 'video' = 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/campaigns/drafts/${draftId}/media?kind=${kind}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer dev',
        'X-Org-Id': 'a35d1c9d-cf78-44f2-8695-5c032f0ad411',
      },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Media upload failed with ${res.status}`);
    }
    return res.json();
  },

  publishDraft: (draftId: string) =>
    api<{ success: boolean; campaign_id: string }>(`/campaigns/drafts/${draftId}/publish`, {
      method: 'POST',
    }),
};

export type { LiveAccount, LiveCampaign, LiveAdSet, LiveAd, LiveInsights };
