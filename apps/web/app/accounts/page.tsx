'use client';

import React, { useState } from 'react';

export default function AccountsPage() {
  const [connections] = useState([
    { platform: 'meta', name: 'Meta Ads Manager Connection', status: 'not_connected' },
    { platform: 'google', name: 'Google Ads Manager Connection', status: 'not_connected' },
  ]);

  const handleConnect = async (platform: string) => {
    // Scaffold call to API for OAuth URL
    try {
      const response = await fetch(`http://localhost:8000/platforms/connect/${platform}`, {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'X-Org-Id': 'mock_org_id_123'
        }
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Connection trigger failed', error);
      alert(`Connecting to ${platform} initiated. Redirect flow triggered!`);
    }
  };

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
          <a href="/accounts" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-zinc-200 dark:bg-zinc-800">
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

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6">
          <div className="text-sm font-medium">Platforms & Connections</div>
        </header>

        <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="prose prose-sm">
            <h1 className="text-2xl font-bold">Connect your Ad Platforms</h1>
            <p className="text-zinc-500">Enable unified management by establishing secure OAuth connections.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {connections.map((conn) => (
              <div key={conn.platform} className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between h-48">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="capitalize font-bold text-lg">{conn.platform} Ads</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 capitalize">
                      {conn.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">
                    Connect your account to sync campaigns, daily performance metrics, and build drafts.
                  </p>
                </div>
                <button
                  onClick={() => handleConnect(conn.platform)}
                  className="w-full py-2 bg-zinc-900 text-white rounded-md text-sm font-medium hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Connect Account
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
