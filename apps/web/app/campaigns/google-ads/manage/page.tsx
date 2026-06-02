'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import { campaignsApi } from '../../../../lib/campaignsApi';
import { RefreshCw } from 'lucide-react';

export default function GoogleCampaignsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const bootstrap = async () => {
    try {
      await campaignsApi.listLiveAccounts('Lamanify');
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
      <Sidebar currentPath="/campaigns/google-ads/manage" />

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
                onClick={() => router.push('/campaigns/google-ads/build')}
                className="px-3 py-1 rounded-md transition-colors text-zinc-500"
              >
                Build
              </button>
            </div>
            <div className="text-sm font-medium flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <span>Google Ads — Manage Live</span>
            </div>
          </div>
        </header>

        <div className="p-8 h-full overflow-y-auto space-y-8 max-w-7xl w-full mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lamanify Account Control</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Live Google Campaign, Ad Group, and Ads hierarchy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => bootstrap()} className="p-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-semibold">Google Ads Connection Required</h3>
              <p className="text-xs text-zinc-500">There are no live campaigns available because your Google Ads account is not connected yet.</p>
            </div>
            <button 
              onClick={() => router.push('/accounts')}
              className="px-4 py-2 bg-brand text-white text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Connect Google Ads Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}