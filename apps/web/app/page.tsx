import React from 'react';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-4 font-bold border-b border-zinc-200 dark:border-zinc-800">
          LamaniAds
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-800">
            Overview
          </a>
          <a href="/accounts" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Accounts
          </a>
          <a href="/campaigns" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Campaigns
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Drafts
          </a>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
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
              <p className="mt-2 text-3xl font-semibold font-mono">0</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total Spend</p>
              <p className="mt-2 text-3xl font-semibold font-mono">$0.00</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Impressions</p>
              <p className="mt-2 text-3xl font-semibold font-mono">0</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Conversions</p>
              <p className="mt-2 text-3xl font-semibold font-mono">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
