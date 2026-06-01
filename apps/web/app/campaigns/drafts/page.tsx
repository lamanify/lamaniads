'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Edit3, FileText } from 'lucide-react';
import Sidebar from '../../../components/Sidebar';
import { campaignsApi } from '../../../lib/campaignsApi';
import { Button } from '../../../components/ui/Button';

interface DraftRow {
  id: string;
  name: string;
  client_name?: string | null;
  status: string;
  step: number;
  platform_account_id: string;
  campaign_payload?: any;
  published_campaign_id?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-400/10 text-zinc-500',
  ready_for_review: 'bg-blue-500/10 text-blue-400',
  awaiting_client: 'bg-amber-500/10 text-amber-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  publishing: 'bg-blue-500/10 text-blue-400',
  published: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400',
};

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await campaignsApi.listDrafts();
      setDrafts(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft permanently?')) return;
    await campaignsApi.deleteDraft(id);
    load();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 dark">
      <Sidebar currentPath="/campaigns" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950">
          <div className="text-sm font-medium">Campaign Drafts</div>
          <div className="flex items-center gap-2">
            <Link href="/campaigns">
              <Button variant="secondary" size="sm">
                Live campaigns
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-8 h-full overflow-y-auto space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Drafts</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Resume in-progress campaigns or remove abandoned drafts.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-x-auto bg-white dark:bg-zinc-950">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="text-zinc-500 dark:text-zinc-400 text-[11px] uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Step</th>
                  <th className="px-6 py-3 font-medium">Account</th>
                  <th className="px-6 py-3 font-medium">Updated</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-zinc-900 dark:text-zinc-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-[13px]">
                      Loading drafts...
                    </td>
                  </tr>
                ) : drafts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-[13px]">
                      <FileText className="h-6 w-6 mx-auto text-zinc-400 dark:text-zinc-600 mb-2" />
                      No drafts yet. Start a new campaign from the campaigns page.
                    </td>
                  </tr>
                ) : (
                  drafts.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                          {d.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                        {d.client_name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium ${
                            STATUS_COLORS[d.status] || 'bg-zinc-400/10 text-zinc-500'
                          }`}
                        >
                          {d.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                        {d.step} / 3
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {d.platform_account_id}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/campaigns/new?draft=${d.id}`)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Resume
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
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
