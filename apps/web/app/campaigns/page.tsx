'use client';

import React, { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetch for Wave 7 demo
    setTimeout(() => {
      setCampaigns([
        { id: '1', name: 'Meta Leads Campaign', platform: 'meta', status: 'active', budget: 500, currency: 'USD' },
        { id: '2', name: 'Google Search Alpha', platform: 'google', status: 'paused', budget: 1200, currency: 'USD' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-4 font-bold border-b border-zinc-200 dark:border-zinc-800">
          LamaniAds
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Overview
          </a>
          <a href="/accounts" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Accounts
          </a>
          <a href="/campaigns" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-800">
            Campaigns
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Drafts
          </a>
        </nav>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="text-sm font-medium">Campaigns</div>
        </header>

        <div className="p-8 h-full overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Campaign Management</h1>
            <button className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 text-sm font-medium rounded-md">
              Create Sync Request
            </button>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Platform</th>
                  <th className="px-6 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Campaign Name</th>
                  <th className="px-6 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Status</th>
                  <th className="px-6 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800 text-right">Daily Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400 animate-pulse">Loading campaigns...</td></tr>
                ) : campaigns.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-400">No campaigns found.</td></tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${c.platform === 'meta' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {c.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{c.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                          <span className="capitalize">{c.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">${c.budget.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
