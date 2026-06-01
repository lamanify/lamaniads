'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { campaignsApi, LiveAccount, LiveCampaign, LiveInsights } from '../../lib/campaignsApi';
import { Edit3, Trash2, ChevronRight, ChevronDown, RefreshCw, Filter, Columns } from 'lucide-react';

const DEFAULT_ACCOUNT_KEY = 'lamani_selected_account_id';

export default function CampaignsPage() {
  const router = useRouter();
  const [activePlatform, setActivePlatform] = useState<'meta' | 'google'>('meta');
  const [activeMode, setActiveMode] = useState<'manage' | 'build'>('manage');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const platformParam = urlParams.get('platform');
      if (platformParam === 'google' || platformParam === 'meta') {
        setActivePlatform(platformParam);
      }
    }
  }, [router]);
  const [accounts, setAccounts] = useState<LiveAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<LiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set());
  const [campaignInsights, setCampaignInsights] = useState<Record<string, LiveInsights>>({});
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [statusFilter] = useState<Set<string>>(new Set(['active', 'paused']));
  
  // Custom Google Ads Column toggles
  const [googleColumns, setGoogleColumns] = useState<Record<string, boolean>>({
    spend: true,
    impressions: true,
    reach: true,
    clicks: true,
    ctr: true,
    cpc: true,
    leads: true,
    conversion_rate: true,
    cpl: true,
    frequency: true,
    search_impression_share: true,
    search_lost_is_budget: false,
    search_lost_is_rank: false,
    avg_cpc: true,
    quality_score: false,
    avg_position: false,
    impressions_search: false,
    clicks_search: false,
    conversion_value: false,
  });

  const readCache = <T,>(key: string): T | null => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  };

  const bootstrap = async (platform = activePlatform) => {
    setError(null);
    try {
      const accts = await campaignsApi.listLiveAccounts('Lamanify');
      setAccounts(accts);
      const savedDefault = readCache<string>(`${DEFAULT_ACCOUNT_KEY}_${platform}`) || (accts[0] ? accts[0].platform_account_id : '');
      setSelectedAccountId(savedDefault);
    } catch (err: any) {
      setError(err.message || `Failed to load ${platform === 'google' ? 'Google' : 'Meta'} accounts.`);
    }
  };

  const loadCampaigns = async (accountId = selectedAccountId, options: { silent?: boolean } = {}) => {
    if (!accountId) return;
    if (!options.silent) setLoading(true);
    try {
      const data = await campaignsApi.listLiveCampaigns(accountId, activePlatform);
      setCampaigns(data);
      const insightsMap = await campaignsApi.getAllCampaignInsights(accountId, activePlatform).catch(() => ({}));
      setCampaignInsights(insightsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async (platform = activePlatform) => {
    setDraftsLoading(true);
    try {
      const data = await campaignsApi.listDrafts(platform);
      setDrafts(data);
    } catch {
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    bootstrap(activePlatform);
    loadDrafts();
  }, [activePlatform]);

  useEffect(() => {
    if (selectedAccountId) {
      loadCampaigns(selectedAccountId);
      setExpandedCampaignIds(new Set());
    }
  }, [selectedAccountId, activePlatform]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => statusFilter.has(c.status.toLowerCase()));
  }, [campaigns, statusFilter]);

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.platform_account_id === selectedAccountId),
  [accounts, selectedAccountId]);

  const toggleCampaign = (id: string) => {
    setExpandedCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleStatus = async (c: LiveCampaign) => {
    setActionLoading(c.platform_campaign_id);
    try {
      const newStatus = c.status.toLowerCase() === 'active' ? 'PAUSED' : 'ACTIVE';
      await campaignsApi.updateCampaignStatus(c.platform_campaign_id, newStatus as 'ACTIVE' | 'PAUSED');
      setCampaigns(prev => prev.map(item => 
        item.platform_campaign_id === c.platform_campaign_id ? { ...item, status: newStatus.toLowerCase() } : item
      ));
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft permanently?')) return;
    await campaignsApi.deleteDraft(id);
    setDrafts(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
      <Sidebar currentPath="/campaigns" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md text-xs font-semibold mr-2 border border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setActiveMode('manage')}
                className={`px-3 py-1 rounded-md transition-colors ${activeMode === 'manage' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}
              >
                Manage
              </button>
              <button 
                onClick={() => {
                  if (activePlatform === 'meta') {
                    router.push(`/campaigns/new?account_id=${selectedAccountId}`);
                  } else {
                    setActiveMode('build');
                  }
                }}
                className={`px-3 py-1 rounded-md transition-colors ${activeMode === 'build' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}
              >
                Build
              </button>
            </div>
            <div className="text-sm font-medium flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <span className="capitalize">{activePlatform} Ads — {activeMode === 'manage' ? 'Manage Live' : 'Build Campaign'}</span>
              {error && <span className="text-xs text-red-500 font-normal">({error})</span>}
            </div>
            {accounts.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {selectedAccount?.name || 'Select Account'}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showAccountDropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-50 py-1">
                    {accounts.map(a => (
                      <button
                        key={a.platform_account_id}
                        onClick={() => {
                          setSelectedAccountId(a.platform_account_id);
                          setShowAccountDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${selectedAccountId === a.platform_account_id ? 'bg-zinc-50 dark:bg-zinc-900 font-semibold' : ''}`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="p-8 h-full overflow-y-auto space-y-8 max-w-7xl w-full mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lamanify Account Control</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {activeMode === 'manage' 
                  ? `Live ${activePlatform === 'google' ? 'Google' : 'Meta'} Campaign, ${activePlatform === 'google' ? 'Ad Group' : 'Ad Set'}, and Ads hierarchy.`
                  : `Create and configure your ${activePlatform === 'google' ? 'Google' : 'Meta'} campaigns.`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadCampaigns(selectedAccountId, { silent: true })} className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {activeMode === 'build' ? (
            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center space-y-4">
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-sm font-semibold">Google Ads Campaign Builder</h3>
                <p className="text-xs text-zinc-500">Construct and review Google Ads campaigns, ad groups, and ads structure here.</p>
              </div>
              <button 
                onClick={() => alert('Google Ads campaign creation wizard is coming soon!')}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                Launch Builder
              </button>
            </div>
          ) : (
            <>
              {(draftsLoading || drafts.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Drafts</h2>
                    <span className="text-xs text-zinc-500">{drafts.length} in progress</span>
                  </div>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-[11px] uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-6 py-3 font-medium">Name</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {draftsLoading ? (
                          <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-400">Loading drafts...</td></tr>
                        ) : (
                          drafts.map(d => (
                            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                              <td className="px-6 py-3 font-medium">{d.name}</td>
                              <td className="px-6 py-3 capitalize text-zinc-500">{d.status}</td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex justify-end items-center gap-2">
                                  <button onClick={() => router.push(`/campaigns/new?draft=${d.id}`)} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteDraft(d.id)} className="p-1.5 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Live Campaigns</h2>
                    <div className="flex items-center gap-2 relative">
                       <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                          <Filter className="h-3 w-3" /> Filter
                       </button>
                       <button onClick={() => setShowColumnDropdown(!showColumnDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                          <Columns className="h-3 w-3" /> Columns
                       </button>
                       {showColumnDropdown && activePlatform === 'google' && (
                         <div className="absolute right-0 mt-8 w-56 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-50 p-2 space-y-1">
                           <div className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1">Toggle Columns</div>
                           {Object.keys(googleColumns).map(col => (
                             <label key={col} className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded cursor-pointer text-xs select-none">
                               <input 
                                 type="checkbox" 
                                 checked={googleColumns[col]} 
                                 onChange={(e) => setGoogleColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                 className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900"
                               />
                               <span className="capitalize">{col.replace(/_/g, ' ')}</span>
                             </label>
                           ))}
                         </div>
                       )}
                    </div>
                 </div>
                 
                 <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950 overflow-x-auto">
                    <table className="w-full text-left text-[13px] border-collapse min-w-max">
                      {activePlatform === 'meta' ? (
                        <>
                          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                              <th className="px-6 py-3 font-medium">Name / Hierarchy</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                              <th className="px-6 py-3 font-medium">Objective</th>
                              <th className="px-6 py-3 font-medium text-right">Budget</th>
                              <th className="px-6 py-3 font-medium text-right">Leads</th>
                              <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">Loading live campaigns...</td></tr>
                            ) : filteredCampaigns.length === 0 ? (
                              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400">No live campaigns found.</td></tr>
                            ) : filteredCampaigns.map(c => (
                              <tr key={c.platform_campaign_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-2">
                                     <button onClick={() => toggleCampaign(c.platform_campaign_id)}>
                                        {expandedCampaignIds.has(c.platform_campaign_id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                     </button>
                                     <div className="font-medium">{c.name}</div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 capitalize">{c.status.toLowerCase()}</td>
                                <td className="px-6 py-4 text-[11px] font-mono text-zinc-500 uppercase">{c.normalized_payload_json?.objective || '—'}</td>
                                <td className="px-6 py-4 text-right tabular-nums">{c.budget_amount > 0 ? `${selectedAccount?.currency || ''} ${(c.budget_amount / 100).toFixed(2)}` : '—'}</td>
                                <td className="px-6 py-4 text-right font-semibold">{campaignInsights[c.platform_campaign_id]?.leads || 0}</td>
                                <td className="px-6 py-4 text-right">
                                   <button 
                                     onClick={() => handleToggleStatus(c)} 
                                     disabled={actionLoading === c.platform_campaign_id}
                                     className={`px-3 py-1 text-[11px] font-medium rounded border transition-colors ${c.status.toLowerCase() === 'active' ? 'border-zinc-300 text-zinc-600 hover:text-zinc-900' : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-transparent'}`}
                                   >
                                     {actionLoading === c.platform_campaign_id ? '...' : c.status.toLowerCase() === 'active' ? 'Pause' : 'Resume'}
                                   </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      ) : (
                        <>
                          <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] uppercase tracking-widest text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                              <th className="px-6 py-3 font-medium">Name / Hierarchy</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                              <th className="px-6 py-3 font-medium">Channel Type</th>
                              {googleColumns.spend && <th className="px-6 py-3 font-medium text-right">Spend</th>}
                              {googleColumns.impressions && <th className="px-6 py-3 font-medium text-right">Impressions</th>}
                              {googleColumns.reach && <th className="px-6 py-3 font-medium text-right">Reach</th>}
                              {googleColumns.clicks && <th className="px-6 py-3 font-medium text-right">Clicks</th>}
                              {googleColumns.ctr && <th className="px-6 py-3 font-medium text-right">CTR</th>}
                              {googleColumns.cpc && <th className="px-6 py-3 font-medium text-right">CPC</th>}
                              {googleColumns.leads && <th className="px-6 py-3 font-medium text-right">Conversions (Leads)</th>}
                              {googleColumns.conversion_rate && <th className="px-6 py-3 font-medium text-right">Conversion Rate</th>}
                              {googleColumns.cpl && <th className="px-6 py-3 font-medium text-right">CPL</th>}
                              {googleColumns.frequency && <th className="px-6 py-3 font-medium text-right">Frequency</th>}
                              {googleColumns.search_impression_share && <th className="px-6 py-3 font-medium text-right">Search IS</th>}
                              {googleColumns.search_lost_is_budget && <th className="px-6 py-3 font-medium text-right">Search Lost IS (budget)</th>}
                              {googleColumns.search_lost_is_rank && <th className="px-6 py-3 font-medium text-right">Search Lost IS (rank)</th>}
                              {googleColumns.avg_cpc && <th className="px-6 py-3 font-medium text-right">Avg. CPC</th>}
                              {googleColumns.quality_score && <th className="px-6 py-3 font-medium text-right">Quality Score</th>}
                              {googleColumns.avg_position && <th className="px-6 py-3 font-medium text-right">Avg. Position</th>}
                              {googleColumns.impressions_search && <th className="px-6 py-3 font-medium text-right">Impressions (Search)</th>}
                              {googleColumns.clicks_search && <th className="px-6 py-3 font-medium text-right">Clicks (Search)</th>}
                              {googleColumns.conversion_value && <th className="px-6 py-3 font-medium text-right">Conversion Value</th>}
                              <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                              <tr><td colSpan={24} className="px-6 py-12 text-center text-zinc-400">Loading live campaigns...</td></tr>
                            ) : filteredCampaigns.length === 0 ? (
                              <tr><td colSpan={24} className="px-6 py-12 text-center text-zinc-400">No live campaigns found.</td></tr>
                            ) : filteredCampaigns.map(c => {
                              const insights = (campaignInsights[c.platform_campaign_id] || {}) as Partial<LiveInsights>;
                              const currency = selectedAccount?.currency || 'USD';
                              return (
                                <tr key={c.platform_campaign_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-2">
                                       <button onClick={() => toggleCampaign(c.platform_campaign_id)}>
                                          {expandedCampaignIds.has(c.platform_campaign_id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                       </button>
                                       <div className="font-medium">{c.name}</div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 capitalize">{c.status.toLowerCase()}</td>
                                  <td className="px-6 py-4 text-[11px] font-mono text-zinc-500 uppercase">
                                     {c.normalized_payload_json?.advertising_channel_type || '—'}
                                  </td>
                                  {googleColumns.spend && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {currency} {(insights.spend || 0).toFixed(2)}
                                    </td>
                                  )}
                                  {googleColumns.impressions && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.impressions || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.reach && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.reach || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.clicks && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.clicks || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.ctr && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {((insights.ctr || 0) * 100).toFixed(2)}%
                                    </td>
                                  )}
                                  {googleColumns.cpc && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {currency} {(insights.cpc || 0).toFixed(2)}
                                    </td>
                                  )}
                                  {googleColumns.leads && (
                                    <td className="px-6 py-4 text-right font-semibold tabular-nums">
                                      {(insights.leads || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.conversion_rate && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {((insights.conversion_rate || 0) * 100).toFixed(2)}%
                                    </td>
                                  )}
                                  {googleColumns.cpl && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {currency} {(insights.cost_per_lead || 0).toFixed(2)}
                                    </td>
                                  )}
                                  {googleColumns.frequency && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.frequency || 1.0).toFixed(2)}
                                    </td>
                                  )}
                                  {googleColumns.search_impression_share && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.search_impression_share || 0).toFixed(2)}%
                                    </td>
                                  )}
                                  {googleColumns.search_lost_is_budget && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.search_lost_is_budget || 0).toFixed(2)}%
                                    </td>
                                  )}
                                  {googleColumns.search_lost_is_rank && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.search_lost_is_rank || 0).toFixed(2)}%
                                    </td>
                                  )}
                                  {googleColumns.avg_cpc && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {currency} {(insights.avg_cpc || 0).toFixed(2)}
                                    </td>
                                  )}
                                  {googleColumns.quality_score && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {insights.quality_score || '—'}
                                    </td>
                                  )}
                                  {googleColumns.avg_position && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.avg_position || 0).toFixed(1)}
                                    </td>
                                  )}
                                  {googleColumns.impressions_search && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.impressions_search || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.clicks_search && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {(insights.clicks_search || 0).toLocaleString()}
                                    </td>
                                  )}
                                  {googleColumns.conversion_value && (
                                    <td className="px-6 py-4 text-right tabular-nums">
                                      {currency} {(insights.conversion_value || 0).toFixed(2)}
                                    </td>
                                  )}
                                  <td className="px-6 py-4 text-right">
                                     <button 
                                       onClick={() => handleToggleStatus(c)} 
                                       disabled={actionLoading === c.platform_campaign_id}
                                       className={`px-3 py-1 text-[11px] font-medium rounded border transition-colors ${c.status.toLowerCase() === 'active' ? 'border-zinc-300 text-zinc-600 hover:text-zinc-900' : 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-transparent'}`}
                                     >
                                       {actionLoading === c.platform_campaign_id ? '...' : c.status.toLowerCase() === 'active' ? 'Pause' : 'Resume'}
                                     </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}
                    </table>
                 </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
