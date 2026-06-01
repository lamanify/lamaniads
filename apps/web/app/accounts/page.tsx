'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../supabase';

export const dynamic = 'force-dynamic';

type Connection = {
  status: string;
  id?: string;
  account_name?: string | null;
  account_email?: string | null;
};

export default function AccountsPage() {
  const [connections, setConnections] = useState<Record<string, Connection>>({
    meta: { status: 'not_connected' },
    google: { status: 'not_connected' },
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membershipData, error: memError } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .single() as { data: { org_id: string } | null, error: any };

      if (memError || !membershipData) throw memError || new Error('No organization membership found.');
      setOrgId(membershipData.org_id);

      const { data: connData, error: connError } = await supabase
        .from('platform_connections')
        .select('id, platform, status, account_name, account_email')
        .eq('org_id', membershipData.org_id);

      if (connError) throw connError;

      const connectionMap: Record<string, Connection> = {
        meta: { status: 'not_connected' },
        google: { status: 'not_connected' },
      };

      if (connData) {
        connData.forEach((c: any) => {
          if (c.platform in connectionMap) {
            connectionMap[c.platform] = {
              status: c.status,
              id: c.id,
              account_name: c.account_name,
              account_email: c.account_email,
            };
          }
        });
      }
      setConnections(connectionMap);
    } catch (err: any) {
      console.error('Error fetching connections:', err);
      setError(err.message || 'Failed to load connections.');
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnect = async (platform: string) => {
    setLoading(platform);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/platforms-connect?platform=${platform}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-Org-Id': orgId || ''
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirect URL returned from API');
      }
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      setError(`Failed to connect ${platform}: ${msg}`);
      console.error('Connection trigger failed', err);
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    const conn = connections[platform];
    if (!conn?.id) return;
    setLoading(`disconnect-${platform}`);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/platforms-disconnect?connection_id=${conn.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Org-Id': orgId || ''
          }
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      await fetchConnections();
    } catch (err: any) {
      setError(`Failed to disconnect ${platform}: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath="/accounts" />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="text-sm font-medium">Platforms & Connections</div>
        </header>

        <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="prose prose-sm">
            <h1 className="text-2xl font-bold">Connect your Ad Platforms</h1>
            <p className="text-zinc-500">Enable unified management by establishing secure OAuth connections.</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {['meta', 'google'].map((platform) => {
              const conn = connections[platform] || { status: 'not_connected' };
              const isConnected = conn.status === 'active';
              const isDisconnecting = loading === `disconnect-${platform}`;
              const isConnecting = loading === platform;

              return (
                <div key={platform} className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="capitalize font-bold text-lg">{platform} Ads</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-semibold ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {conn.status.replace('_', ' ')}
                      </span>
                    </div>

                    {isConnected && (conn.account_name || conn.account_email) ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {(conn.account_name || conn.account_email || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {conn.account_name && (
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{conn.account_name}</p>
                          )}
                          {conn.account_email && (
                            <p className="text-xs text-zinc-500 truncate">{conn.account_email}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 mt-2">
                        {isConnected
                          ? `Your ${platform} Ad Account is synced and generating unified analytics.`
                          : `Connect your ${platform} account to sync campaigns, daily performance metrics, and build drafts.`}
                      </p>
                    )}
                  </div>

                  {isConnected ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting || isDisconnecting}
                        className="flex-1 py-2 rounded-md text-sm font-medium transition-colors bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? 'Reconnecting...' : 'Reconnect'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(platform)}
                        disabled={isConnecting || isDisconnecting}
                        className="flex-1 py-2 rounded-md text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting}
                      className="w-full py-2 rounded-md text-sm font-medium transition-colors bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Account'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
