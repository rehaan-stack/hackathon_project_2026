'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Header } from '@/components/navigation/Header';
import { PublicNav } from '@/components/navigation/PublicNav';
import { PublicFooter } from '@/components/navigation/PublicFooter';

const PUBLIC_ROUTES = ['/', '/features', '/about', '/contact', '/login', '/signup', '/forgot-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-[#08090d] text-slate-100 font-sans selection:bg-red-500/20 selection:text-red-200">
        <PublicNav />
        <main className="flex-1 min-h-[calc(100vh-140px)] flex flex-col">{children}</main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#08090d] text-slate-100 overflow-hidden font-sans selection:bg-red-500/20 selection:text-red-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#08090d] pb-20 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
