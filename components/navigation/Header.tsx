'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Bell, Check, ChevronDown, LoaderCircle, LogOut, PlayCircle, Settings } from 'lucide-react';
import { HeaderSearchBar } from './HeaderSearchBar';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string }>({
    full_name: 'Account',
    email: '',
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; created_at: string }>>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(true);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setUser({
            full_name: data.user.full_name || 'RECALL User',
            email: data.user.email || '',
          });
        }
      })
      .catch(() => {});

    fetch('/api/dashboard/activity')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.activities)) {
          setNotifications(data.activities.slice(0, 5));
          setHasUnread(data.activities.length > 0);
        }
      })
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, []);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const toggleNotifications = () => {
    setNotificationsOpen((open) => !open);
    setAccountOpen(false);
    setHasUnread(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // The server session still needs to be cleared if Firebase is unavailable.
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 flex-shrink-0 items-center justify-between border-b border-[#1c2230] bg-[#08090d]/95 px-3 backdrop-blur-md sm:px-4 md:h-16 md:px-6">
      {/* Interactive Search Bar with History Dropdown & Fast Search Algorithm */}
      <HeaderSearchBar />

      {/* Right Controls */}
      <div ref={controlsRef} className="relative ml-2 flex flex-shrink-0 items-center gap-1 sm:gap-4">
        {/* Quick Demo Loop Access Button */}
        <Link
          href="/demo"
          id="run-demo-btn"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 hover:bg-red-600/25 text-red-300 text-xs font-medium transition-all group"
        >
          <PlayCircle className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
          <span>Learning Demo</span>
        </Link>

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          onClick={toggleNotifications}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#141824] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#08090d]" />}
        </button>

        {notificationsOpen && (
          <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[#242b3d] bg-[#11141c] shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:right-36 sm:w-80">
            <div className="flex items-center justify-between border-b border-[#1c2230] px-4 py-3">
              <span className="text-xs font-semibold text-white">Recent operational activity</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Check className="w-3 h-3" /> Seen</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notificationsLoading ? <div className="flex justify-center p-6"><LoaderCircle className="w-4 h-4 animate-spin text-slate-500" /></div> : notifications.length === 0 ? <p className="p-5 text-center text-xs text-slate-500">No recent activity.</p> : notifications.map((notification) => (
                <div key={notification.id} className="flex gap-2.5 border-b border-[#1c2230]/70 px-4 py-3 last:border-0">
                  <Activity className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  <div className="min-w-0"><p className="text-[11px] leading-4 text-slate-300">{notification.message}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(notification.created_at).toLocaleString()}</p></div>
                </div>
              ))}
            </div>
            <Link href="/dashboard" onClick={() => setNotificationsOpen(false)} className="block border-t border-[#1c2230] px-4 py-2.5 text-center text-[11px] font-medium text-slate-400 hover:bg-[#141824] hover:text-white">View dashboard activity</Link>
          </div>
        )}

        {/* User Profile */}
        <button onClick={() => { setAccountOpen((open) => !open); setNotificationsOpen(false); }} aria-expanded={accountOpen} className="flex items-center gap-2.5 border-l border-[#1c2230] pl-1 text-left sm:pl-2">
          <div className="w-8 h-8 rounded-full bg-[#1e2433] border border-[#2a344a] flex items-center justify-center text-xs font-semibold text-white">
            {getInitials(user.full_name)}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-medium text-slate-200 block leading-tight">
              {user.full_name}
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {user.email}
            </span>
          </div>
          <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-500 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
        </button>

        {accountOpen && (
          <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#242b3d] bg-[#11141c] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="border-b border-[#1c2230] px-3 py-2.5"><p className="truncate text-xs font-semibold text-white">{user.full_name}</p><p className="truncate text-[10px] text-slate-500">{user.email}</p></div>
            <Link href="/settings" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-[#141824] hover:text-white"><Settings className="w-3.5 h-3.5" /> Account settings</Link>
            <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
