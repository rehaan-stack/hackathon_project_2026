'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  AlertTriangle,
  Search,
  Brain,
  BarChart2,
  FileText,
  Settings,
  Pin,
  PinOff,
  LogOut,
  PlayCircle,
} from 'lucide-react';
import { RecallLogo, RecallWordmark } from '@/components/icons/RecallLogo';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isExpanded = isPinned || isHovered;

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setShowLogoutModal(false);
      setIsLoggingOut(false);
      router.push('/');
      router.refresh();
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { href: '/investigation', label: 'Investigation', icon: Search },
    { href: '/memory', label: 'Memory Intelligence', icon: Brain },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 flex h-20 items-center gap-1 overflow-x-auto border-t border-[#1a1e2a] bg-[#0c0e14]/95 px-2 pb-2 pt-1 backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-medium transition-colors ${
                isActive ? 'bg-red-500/15 text-red-300' : 'text-slate-400 hover:bg-[#141824] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <Link href="/demo" aria-label="Learning Demo" className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-medium transition-colors ${pathname === '/demo' ? 'bg-red-500/15 text-red-300' : 'text-red-300/80 hover:bg-red-500/10'}`}>
          <PlayCircle className="h-4 w-4" />
          <span>Demo</span>
        </Link>
      </nav>

      <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`sticky top-0 hidden h-screen flex-shrink-0 select-none flex-col justify-between overflow-hidden border-r border-[#1a1e2a] bg-[#0c0e14] shadow-2xl transition-all duration-300 ease-in-out md:flex ${
        isExpanded ? 'w-64' : 'w-[72px]'
      }`}
    >
      {/* Top: Brand & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="p-4 pb-5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
            <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <RecallLogo className="w-10 h-10" />
            </div>
            {isExpanded && (
              <div className="leading-tight min-w-0 transition-opacity duration-200">
                <RecallWordmark className="text-lg block" />
                <p className="text-[10px] text-slate-400 font-normal truncate">
                  AI Incident Response Agent
                </p>
              </div>
            )}
          </Link>

          {/* Pin/Slide Toggle Button */}
          {isExpanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Click to unpin (slide on mouse hover)' : 'Click to pin sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors ml-1"
            >
              {isPinned ? (
                <Pin className="w-3.5 h-3.5 text-red-400 rotate-45" />
              ) : (
                <PinOff className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="px-2.5 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white font-semibold shadow-md shadow-red-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#141824]'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {isExpanded && (
                  <span className="text-[13px] truncate transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Quick Learning Demo Link */}
          <Link
            href="/demo"
            title={!isExpanded ? 'Learning Demo' : undefined}
            className={`flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all text-red-300/80 hover:text-red-200 hover:bg-red-500/10 ${
              pathname === '/demo' ? 'bg-red-500/15 border border-red-500/30 font-semibold text-red-300' : ''
            } ${!isExpanded ? 'justify-center px-0' : ''}`}
          >
            <PlayCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            {isExpanded && <span className="text-[13px] truncate">Learning Demo</span>}
          </Link>
        </nav>
      </div>

      {/* Bottom Section: Unified Stable Box-Sizing Log Out Button */}
      <div className="p-2.5 pt-2 border-t border-[#181c28] box-border">
        <button
          onClick={() => setShowLogoutModal(true)}
          title={!isExpanded ? 'Log Out (End Session)' : undefined}
          className={`group relative w-full h-[50px] box-border rounded-xl flex items-center bg-[#11141e] hover:bg-[#181520] border border-[#202636] hover:border-red-500/50 transition-colors duration-200 shadow-sm hover:shadow-[0_0_20px_rgba(239,68,68,0.18)] cursor-pointer overflow-hidden ${
            isExpanded ? 'px-3 justify-start' : 'justify-center px-0'
          }`}
        >
          {/* Subtle red indicator stripe on hover */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Icon Container with fixed dimensions */}
          <div className="w-8 h-8 rounded-lg bg-[#161a26] border border-[#252c3e] group-hover:border-red-500/40 group-hover:bg-red-500/10 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 group-hover:-translate-x-0.5 transition-all duration-200" />
          </div>

          {/* Text Container with smooth width & opacity transition - NO box sizing jump */}
          <div
            className={`flex-1 text-left min-w-0 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${
              isExpanded
                ? 'opacity-100 max-w-[160px] ml-3 translate-x-0'
                : 'opacity-0 max-w-0 ml-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <span className="text-[13px] font-semibold block text-slate-200 group-hover:text-white transition-colors duration-200 leading-tight">
              Log Out
            </span>
            <span className="text-[10px] text-slate-500 group-hover:text-red-400/80 block transition-colors duration-200 leading-tight mt-0.5">
              End current session
            </span>
          </div>
        </button>
      </div>

      {/* Logout Confirmation Modal with smooth animations */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoggingOut) setShowLogoutModal(false);
          }}
        >
          <div className="isolate w-full max-w-lg overflow-hidden rounded-2xl border border-[#222a3d] bg-[#0d1017] p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(239,68,68,0.18)] space-y-6 animate-in zoom-in-95 duration-200 sm:p-8">
            {/* Header Icon + Titles */}
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0 shadow-lg shadow-red-950/50">
                <LogOut className="w-7 h-7 text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Are you sure you want to log out?
                </h3>
                <p className="text-sm text-slate-300/90 leading-relaxed">
                  Your active session will be securely terminated. You will need to log back in to access RECALL incident diagnostics, autonomous investigations, and memory controls.
                </p>
              </div>
            </div>

            {/* Action Buttons with increased size and smooth transitions */}
            <div className="relative z-10 flex items-center justify-end gap-3.5 overflow-hidden border-t border-[#1a2130] pt-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-6 py-3 rounded-xl bg-[#141824] hover:bg-[#1b2132] text-slate-300 hover:text-white border border-[#242c3f] text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 hover:border-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="relative isolate flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-rose-700 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-red-950/70 transition-all duration-200 hover:from-red-500 hover:to-rose-600 hover:shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
      </aside>
    </>
  );
}
