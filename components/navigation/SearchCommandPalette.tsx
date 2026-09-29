'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  AlertTriangle,
  Brain,
  Home,
  Server,
  ArrowRight,
  Sparkles,
  History,
  Clock,
  Trash2,
} from 'lucide-react';

export interface SearchItem {
  id: string;
  title: string;
  category: 'incident' | 'page' | 'service' | 'memory';
  subtitle?: string;
  url: string;
  badge?: string;
  badgeColor?: string;
}

const DEFAULT_HISTORY = [
  'INC-1090 payment latency',
  'checkout-service pool limit',
  'Redis cache desync',
  'system health report',
];

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  // Pages
  {
    id: 'page-dash',
    title: 'Dashboard Overview',
    category: 'page',
    subtitle: 'System health, recent telemetry, MTTR metrics',
    url: '/dashboard',
    badge: 'Overview',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    id: 'page-incidents',
    title: 'Incident Management',
    category: 'page',
    subtitle: 'Filter, create, and inspect system outages',
    url: '/incidents',
    badge: 'Operations',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    id: 'page-investigation',
    title: 'AI Investigation Workspace',
    category: 'page',
    subtitle: 'Autonomous anomaly root-cause diagnosis engine',
    url: '/investigation',
    badge: 'AI Reasoning',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    id: 'page-memory',
    title: 'Memory Intelligence',
    category: 'page',
    subtitle: 'Organizational learning and Hindsight experience bank',
    url: '/memory',
    badge: 'Hindsight',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'page-analytics',
    title: 'Analytics & SLA Trends',
    category: 'page',
    subtitle: 'Resolution velocity, MTTR distributions, patterns',
    url: '/analytics',
    badge: 'Metrics',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 'page-reports',
    title: 'Incident Reports & Postmortems',
    category: 'page',
    subtitle: 'Automated executive summaries and download exports',
    url: '/reports',
    badge: 'Reports',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    id: 'page-settings',
    title: 'Settings & Architecture',
    category: 'page',
    subtitle: 'Provider status, Hindsight connectivity, diagnostics',
    url: '/settings',
    badge: 'System',
    badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
  {
    id: 'page-demo',
    title: 'Proof of Learning Demo',
    category: 'page',
    subtitle: 'Experience Hindsight memory loop with INC-1090 & INC-1091',
    url: '/demo',
    badge: 'Interactive',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },

  // Services
  {
    id: 'svc-checkout',
    title: 'checkout-service',
    category: 'service',
    subtitle: 'Cart API, payment routing, redis lock orchestration',
    url: '/incidents?service=checkout-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'svc-payment',
    title: 'payment-service',
    category: 'service',
    subtitle: 'Gateway authorization, tokenization, card settlement',
    url: '/incidents?service=payment-service',
    badge: 'Critical Service',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    id: 'svc-user',
    title: 'user-service',
    category: 'service',
    subtitle: 'Session tokens, JWT authentication, user metadata cache',
    url: '/incidents?service=user-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'svc-notification',
    title: 'notification-service',
    category: 'service',
    subtitle: 'Push notifications, SMS webhooks, email queues',
    url: '/incidents?service=notification-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },

  // Memories / Playbooks
  {
    id: 'mem-pool',
    title: 'Database Connection Pool Exhaustion',
    category: 'memory',
    subtitle: 'Mitigation: increase pool limit to 350, isolate analytical queries',
    url: '/memory?q=pool',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'mem-redis',
    title: 'Redis Cache Deserialization Anomaly',
    category: 'memory',
    subtitle: 'Mitigation: flush stale keys, update schema migration parser',
    url: '/memory?q=redis',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'mem-thread',
    title: 'Thread Pool Saturation & Deadlock',
    category: 'memory',
    subtitle: 'Mitigation: adjust thread worker concurrency, enforce timeouts',
    url: '/memory?q=thread',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
];

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchCommandPalette({ isOpen, onClose }: SearchCommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'history' | 'incident' | 'page' | 'service' | 'memory'>('all');
  const [liveIncidents, setLiveIncidents] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [historyItems, setHistoryItems] = useState<string[]>(DEFAULT_HISTORY);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recall_search_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistoryItems(parsed);
        }
      }
    } catch {}
  }, []);

  const saveHistory = useCallback((newItems: string[]) => {
    setHistoryItems(newItems);
    try {
      localStorage.setItem('recall_search_history', JSON.stringify(newItems));
    } catch {}
  }, []);

  const addSearchToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setHistoryItems((prev) => {
      const filtered = prev.filter((i) => i.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('recall_search_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const removeHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyItems.filter((i) => i !== term);
    saveHistory(updated);
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveHistory([]);
  };

  // Fetch live incidents from database on mount or open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/incidents')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.incidents)) {
          const mapped: SearchItem[] = data.incidents.map((inc: {
            id: string;
            title: string;
            service: string;
            severity: string;
            status: string;
          }) => ({
            id: `inc-${inc.id}`,
            title: `${inc.id}: ${inc.title}`,
            category: 'incident',
            subtitle: `Service: ${inc.service} • Status: ${inc.status}`,
            url: `/incidents/${inc.id}`,
            badge: inc.severity,
            badgeColor:
              inc.severity === 'SEV-1'
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : inc.severity === 'SEV-2'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          }));
          setLiveIncidents(mapped);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Combined Items
  const allItems = useMemo(() => {
    return [...liveIncidents, ...STATIC_SEARCH_ITEMS];
  }, [liveIncidents]);

  // Fast Searching Algorithm: Sub-millisecond tokenized scoring
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeCategory !== 'all' && activeCategory !== 'history') {
      items = items.filter((item) => item.category === activeCategory);
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return items.slice(0, 10);
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);

    // Score items using fast bitwise heuristic
    const scored = items
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const subtitleLower = (item.subtitle || '').toLowerCase();
        const badgeLower = (item.badge || '').toLowerCase();
        const idLower = item.id.toLowerCase();

        // Exact ID or full title match
        if (titleLower === trimmed || idLower === trimmed) {
          score += 200;
        } else if (titleLower.startsWith(trimmed)) {
          score += 120;
        } else if (idLower.includes(trimmed)) {
          score += 90;
        }

        for (const token of tokens) {
          if (titleLower.includes(token)) score += 40;
          if (subtitleLower.includes(token)) score += 20;
          if (badgeLower.includes(token)) score += 25;
          if (idLower.includes(token)) score += 30;
        }

        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    return scored.slice(0, 12);
  }, [allItems, activeCategory, query]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      addSearchToHistory(item.title);
      onClose();
      router.push(item.url);
    },
    [addSearchToHistory, onClose, router]
  );

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    addSearchToHistory(term);
    inputRef.current?.focus();
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: SearchItem['category']) => {
    switch (cat) {
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'page':
        return <Home className="w-4 h-4 text-blue-400" />;
      case 'service':
        return <Server className="w-4 h-4 text-purple-400" />;
      case 'memory':
        return <Brain className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0c0f17] border border-[#222a3d] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(239,68,68,0.15)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-[#1c2333] flex items-center gap-3 bg-[#0e121c]">
          <Search className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents (e.g. INC-1090), services, playbooks, or pages..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#1a2030] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 rounded-lg bg-[#141926] border border-[#232b3e] text-[10px] font-mono text-slate-400 select-none">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0a0d14] border-b border-[#181d2a] overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-500 mr-1 flex-shrink-0">Filter:</span>
          {[
            { id: 'all', label: 'All Results' },
            { id: 'history', label: 'History' },
            { id: 'incident', label: 'Incidents' },
            { id: 'service', label: 'Services' },
            { id: 'page', label: 'Navigation' },
            { id: 'memory', label: 'Hindsight Memory' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === tab.id
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#141824]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Animated Search History Dropdown Box (When query is empty or History tab selected) */}
        {(query === '' || activeCategory === 'history') && historyItems.length > 0 && (
          <div className="p-3.5 bg-[#090b12] border-b border-[#181d2a] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-red-400" />
                Recent Search History
              </span>
              <button
                type="button"
                onClick={clearAllHistory}
                className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {historyItems.map((term, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectHistory(term)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-[#1a2134] text-slate-300 hover:text-white border border-[#20273a] hover:border-red-500/40 text-xs transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <Clock className="w-3 h-3 text-slate-500 group-hover:text-red-400 transition-colors" />
                  <span className="font-medium text-[11px]">{term}</span>
                  <button
                    type="button"
                    onClick={(e) => removeHistoryItem(term, e)}
                    className="p-0.5 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-all ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No matches found for &quot;{query}&quot;</p>
              <p className="text-[11px] text-slate-500">
                Try searching for &quot;INC-1090&quot;, &quot;checkout-service&quot;, &quot;latency&quot;, or &quot;memory&quot;
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-950/40 via-[#181c28] to-[#121622] border border-red-500/40 text-white shadow-sm'
                      : 'hover:bg-[#121622] border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500/40'
                          : 'bg-[#141926] border-[#222a3d]'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold truncate text-slate-100">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 flex-shrink-0 ml-3">
                    <span className="text-[10px] font-mono hidden sm:inline">Jump</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#080a10] border-t border-[#181d2a] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-[#121622] border border-[#202738]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[#121622] border border-[#202738]">↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#121622] border border-[#202738]">↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-[#121622] border border-[#202738]">esc</kbd> close</span>
          </div>
          <span className="text-red-400/80">RECALL Search Engine</span>
        </div>
      </div>
    </div>
  );
}
