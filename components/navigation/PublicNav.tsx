'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecallLogo, RecallWordmark } from '@/components/icons/RecallLogo';

export function PublicNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data?.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-50 px-6 sm:px-10 lg:px-14 py-3.5 transition-all duration-500 ${
          scrolled
            ? 'bg-[#08090d]/95 backdrop-blur-xl border-b border-[#1c2230]/80 shadow-lg shadow-black/20'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="w-full flex items-center justify-between relative">
          {/* Brand - Far Left Corner */}
          <Link href="/" className="flex items-center gap-2.5 group z-10">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 flex items-center justify-center"
            >
              <RecallLogo className="w-9 h-9" />
            </motion.div>
            <RecallWordmark className="text-base group-hover:text-[#ff5a72] transition-colors" />
          </Link>

          {/* Center Nav Links - Precisely Centered View */}
          <nav className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 bg-[#0e111a]/80 px-2 py-1 rounded-xl border border-white/[0.06] backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-[#1a1e2b] border border-white/10 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-red-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons - Shifted to Right Side */}
          <div className="hidden md:flex items-center gap-4 z-10 ml-auto pl-4">
            {isAuthenticated ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-full bg-[#ff204e] hover:bg-[#eb1542] text-white text-sm font-semibold shadow-[0_0_28px_rgba(255,32,78,0.55)] hover:shadow-[0_0_36px_rgba(255,32,78,0.7)] transition-all flex items-center gap-2"
                >
                  <span>Dashboard</span>
                  <Sparkles className="w-4 h-4 text-white" />
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-all shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.08)] flex items-center justify-center backdrop-blur-md"
                  >
                    Login
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login?mode=signup"
                    className="px-6 py-2.5 rounded-full bg-[#ff204e] hover:bg-[#eb1542] text-white text-sm font-semibold shadow-[0_0_28px_rgba(255,32,78,0.55)] hover:shadow-[0_0_36px_rgba(255,32,78,0.7)] transition-all flex items-center gap-2"
                  >
                    <span>Get Started</span>
                    <Sparkles className="w-4 h-4 text-white" />
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-300"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-x-0 top-[60px] z-40 bg-[#0a0c12]/98 backdrop-blur-xl border-b border-[#1c2230] p-6 space-y-3"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#1c2230] space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/login?mode=signup"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold text-center"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
