'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../app/supabase';
import { LogOut, User } from 'lucide-react';

interface SidebarProps {
  currentPath: string;
}

export default function Sidebar({ currentPath }: SidebarProps) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in, redirect if not
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
      } else {
        setEmail(user.email ?? null);
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login';
      } else if (session?.user) {
        setEmail(session.user.email ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force clean reload
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between h-screen">
      <div>
        <div className="p-4 font-bold border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span>LamaniAds</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <nav className="p-4 space-y-1">
          <a
            href="/"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/'
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Overview
          </a>
          <a
            href="/accounts"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/accounts'
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Accounts
          </a>
          <a
            href="/campaigns"
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPath === '/campaigns'
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Campaigns
          </a>
        </nav>
      </div>

      {/* Profile & Logout section */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {email ? email.split('@')[0] : 'Loading...'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {email || 'Checking session...'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
