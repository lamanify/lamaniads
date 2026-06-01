'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from './supabase';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalBudget: 0,
    impressions: 0,
    conversions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user's membership to get org_id
        const { data: membershipData, error: memError } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .single() as { data: { org_id: string } | null, error: any };

        if (memError || !membershipData) throw memError || new Error('No organization membership found.');

        // Fetch campaigns for organization
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('budget_amount')
          .eq('org_id', membershipData.org_id);

        if (campaignsError) throw campaignsError;

        if (campaigns) {
          const totalBudget = campaigns.reduce((acc: number, curr: any) => acc + (curr.budget_amount || 0), 0);
          setStats({
            totalCampaigns: campaigns.length,
            totalBudget: totalBudget / 100, // Budget is in cents
            impressions: 0, // In standard implementation, sync platform accounts table details
            conversions: 0,
          });
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Shared Authenticated Sidebar */}
      <Sidebar currentPath="/" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="text-sm font-medium">Dashboard</div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs text-zinc-500">All systems sync status normal</span>
          </div>
        </header>
        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total Campaigns</p>
              <p className="mt-2 text-3xl font-semibold font-mono">
                {loading ? '...' : stats.totalCampaigns}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total Budget</p>
              <p className="mt-2 text-3xl font-semibold font-mono">
                {loading ? '...' : `$${stats.totalBudget.toFixed(2)}`}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Impressions</p>
              <p className="mt-2 text-3xl font-semibold font-mono">
                {loading ? '...' : stats.impressions}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Conversions</p>
              <p className="mt-2 text-3xl font-semibold font-mono">
                {loading ? '...' : stats.conversions}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
