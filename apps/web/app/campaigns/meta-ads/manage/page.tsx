'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import { campaignsApi, LiveAccount, LiveCampaign, LiveInsights } from '../../../../lib/campaignsApi';
import { ChevronRight, ChevronDown, RefreshCw, Filter, Columns } from 'lucide-react';

const DEFAULT_ACCOUNT_KEY = 'lamani_selected_account_id_meta';

export default function MetaCampaignsPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<LiveAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<LiveCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set());
  const [campaignInsights, setCampaignInsights] = useState<Record<string, LiveInsights>>({});
  
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilter] = useState<Set<string>>(new Set(['active', 'paused']));

  const readCache = <T,>(key: string): T | null => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  };

  const bootstrap = async () => {
    try {
      const accts = await campaignsApi.listLiveAccounts('Lamanify');
      setAccounts(accts);
      const savedDefault = readCache<string>(DEFAULT_ACCOUNT_KEY) || (accts[0] ? accts[0].platform_account_id : '');
      setSelectedAccountId(savedDefault);
    } catch (err: any) {
    }
  };

  const loadCampaigns = async (accountId = selectedAccountId, options: { silent?: boolean } = {}) => {
    if (!accountId) return;
    if (!options.silent) setLoading(true);
    try {
      const data = await campaignsApi.listLiveCampaigns(accountId, 'meta');
      setCampaigns(data);
      const insightsMap = await campaignsApi.getAllCampaignInsights(accountId).catch(() => ({}));
      setCampaignInsights(insightsMap);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadCampaigns(selectedAccountId);
      setExpandedCampaignIds(new Set());
    }
  }, [selectedAccountId]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
      <Sidebar currentPath="/campaigns/meta-ads/manage" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md text-xs font-semibold mr-2 border border-zinc-200 dark:border-zinc-800">
              <button 
                className="px-3 py-1 rounded-md transition-colors bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
              >
                Manage
              </button>
              <button 
                onClick={() => router.push('/campaigns/meta-ads/build')}
                className="px-3 py-1 rounded-md transition-colors text-zinc-500"
              >
                Build
              </button>
            </div>
            <div className="text-sm font-medium flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <span>Meta Ads — Manage Live</span>
            </div>
          </div>
        </header>

        <div className="p-8 h-full overflow-y-auto space-y-8 max-w-7xl w-full mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lamanify Account Control</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Live Meta Campaign, Ad Set, and Ads hierarchy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadCampaigns(selectedAccountId, { silent: true })} className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Live Campaigns</h2>
                <div className="flex items-center gap-2 relative">
                   <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      <Filter className="h-3 w-3" /> Filter
                   </button>
                   <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      <Columns className="h-3 w-3" /> Columns
                   </button>
                </div>
             </div>
             
             <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950 overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse min-w-max">
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
                             className={`px-3 py-1 text-[11px] font-medium rounded border transition-colors ${c.status.toLowerCase() === 'active' ? 'border-zinc-300 text-zinc-600 hover:text-zinc-900' : 'bg-brand text-white border-transparent'}`}
                           >
                             {actionLoading === c.platform_campaign_id ? '...' : c.status.toLowerCase() === 'active' ? 'Pause' : 'Resume'}
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}