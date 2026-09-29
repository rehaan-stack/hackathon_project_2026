'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Clock,
  History,
  Trash2,
  AlertTriangle,
  Server,
  Brain,
  Home,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
  Zap,
  FileText,
  BarChart3,
} from 'lucide-react';

export type SearchCategory =
  | 'incident'
  | 'service'
  | 'memory'
  | 'report'
  | 'analytics'
  | 'action'
  | 'page';

export interface SearchItem {
  id: string;
  title: string;
  category: SearchCategory;
  subtitle?: string;
  url: string;
  badge?: string;
  badgeColor?: string;
  service?: string;
  keywords?: string[];
}

const DEFAULT_HISTORY = [
  'INC-1090 payment latency',
  'checkout-service pool limit',
  'Redis cache desync',
  'system health report',
];

const QUICK_SUGGESTIONS = [
  { label: 'INC-1090', query: 'INC-1090', tag: 'SEV-1' },
  { label: 'checkout-service', query: 'checkout-service', tag: 'Service' },
  { label: 'Database Pool', query: 'pool exhaustion', tag: 'Hindsight' },
  { label: 'AI Investigation', query: 'investigation', tag: 'AI' },
  { label: 'Postmortem Reports', query: 'report', tag: 'Reports' },
  { label: 'MTTR Analytics', query: 'mttr', tag: 'Metrics' },
  { label: 'Health Probe', query: 'probe', tag: 'Action' },
];

const COMPREHENSIVE_SEARCH_ITEMS: SearchItem[] = [
  // -------------------------------------------------------------
  // Navigation Pages
  // -------------------------------------------------------------
  {
    id: 'page-dash',
    title: 'Dashboard Overview',
    category: 'page',
    subtitle: 'System health, recent telemetry, MTTR velocity metrics',
    url: '/dashboard',
    badge: 'Overview',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    keywords: ['home', 'dashboard', 'telemetry', 'health', 'metrics', 'mttr', 'overview'],
  },
  {
    id: 'page-incidents',
    title: 'Incident Management Center',
    category: 'page',
    subtitle: 'Filter, inspect, resolve, and declare operational incidents',
    url: '/incidents',
    badge: 'Operations',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    keywords: ['incidents', 'outage', 'triage', 'severity', 'sev-1', 'operations'],
  },
  {
    id: 'page-investigation',
    title: 'AI Investigation Workspace',
    category: 'page',
    subtitle: 'Autonomous anomaly root-cause diagnosis & hypotheses engine',
    url: '/investigation',
    badge: 'AI Reasoning',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    keywords: ['investigate', 'ai', 'diagnose', 'root cause', 'hypotheses', 'telemetry'],
  },
  {
    id: 'page-memory',
    title: 'Memory Intelligence Bank',
    category: 'page',
    subtitle: 'Organizational learning and Hindsight experience bank',
    url: '/memory',
    badge: 'Hindsight',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['memory', 'hindsight', 'learning', 'experience', 'playbook', 'knowledge'],
  },
  {
    id: 'page-analytics',
    title: 'System Analytics & SLA Trends',
    category: 'page',
    subtitle: 'Resolution velocity, MTTR distributions, recurring patterns',
    url: '/analytics',
    badge: 'Metrics',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    keywords: ['analytics', 'sla', 'mttr', 'trends', 'patterns', 'distribution', 'velocity'],
  },
  {
    id: 'page-reports',
    title: 'Incident Reports & Postmortems',
    category: 'page',
    subtitle: 'Automated executive summaries and download exports',
    url: '/reports',
    badge: 'Reports',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    keywords: ['reports', 'postmortem', 'executive', 'audit', 'compliance', 'export', 'download'],
  },
  {
    id: 'page-settings',
    title: 'Settings & Architecture',
    category: 'page',
    subtitle: 'Provider status, Hindsight connectivity, diagnostic probes',
    url: '/settings',
    badge: 'System',
    badgeColor: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    keywords: ['settings', 'config', 'probe', 'hindsight', 'database', 'environment'],
  },
  {
    id: 'page-demo',
    title: 'Proof of Learning Demo',
    category: 'page',
    subtitle: 'Interactive 10-step Hindsight memory loop with INC-1090 & INC-1091',
    url: '/demo',
    badge: 'Interactive',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    keywords: ['demo', 'learning loop', 'proof', 'simulation', 'interactive', 'test'],
  },

  // -------------------------------------------------------------
  // Microservices & Infrastructure
  // -------------------------------------------------------------
  {
    id: 'svc-checkout',
    title: 'checkout-service',
    category: 'service',
    subtitle: 'Cart API, payment routing, redis lock orchestration',
    url: '/incidents?service=checkout-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    keywords: ['checkout', 'cart', 'orders', 'redis', 'locks'],
  },
  {
    id: 'svc-payment',
    title: 'payment-service',
    category: 'service',
    subtitle: 'Gateway authorization, tokenization, card settlement',
    url: '/incidents?service=payment-service',
    badge: 'Critical Service',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    keywords: ['payment', 'stripe', 'gateway', 'cards', 'transactions', 'billing'],
  },
  {
    id: 'svc-user',
    title: 'user-service',
    category: 'service',
    subtitle: 'Session tokens, JWT authentication, user metadata cache',
    url: '/incidents?service=user-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    keywords: ['user', 'auth', 'jwt', 'session', 'accounts'],
  },
  {
    id: 'svc-notification',
    title: 'notification-service',
    category: 'service',
    subtitle: 'Push notifications, SMS webhooks, email queues',
    url: '/incidents?service=notification-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    keywords: ['notification', 'sms', 'email', 'push', 'webhooks', 'sns'],
  },
  {
    id: 'svc-inventory',
    title: 'inventory-service',
    category: 'service',
    subtitle: 'Warehouse stock synchronization and reservation locks',
    url: '/incidents?service=inventory-service',
    badge: 'Microservice',
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    keywords: ['inventory', 'stock', 'warehouse', 'reservation', 'catalog'],
  },
  {
    id: 'svc-api-gateway',
    title: 'api-gateway',
    category: 'service',
    subtitle: 'Edge routing, rate limiting, and TLS ingress termination',
    url: '/incidents?service=api-gateway',
    badge: 'Gateway',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    keywords: ['gateway', 'edge', 'proxy', 'traefik', 'ingress', 'routing'],
  },
  {
    id: 'svc-database',
    title: 'database-cluster',
    category: 'service',
    subtitle: 'PostgreSQL primary-replica high availability cluster',
    url: '/settings',
    badge: 'Infrastructure',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['database', 'postgres', 'sql', 'cluster', 'storage', 'replica'],
  },
  {
    id: 'svc-redis',
    title: 'redis-cache',
    category: 'service',
    subtitle: 'Distributed Redis cluster v7.2 for caching and session state',
    url: '/settings',
    badge: 'Cache Cluster',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    keywords: ['redis', 'cache', 'memory', 'cluster', 'deserialization'],
  },

  // -------------------------------------------------------------
  // Hindsight Memories & Learned Playbooks
  // -------------------------------------------------------------
  {
    id: 'mem-pool',
    title: 'Database Connection Pool Exhaustion',
    category: 'memory',
    subtitle: 'Mitigation: increase pool limit to 350, isolate analytical queries',
    url: '/memory?q=pool',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['pool', 'exhaustion', 'connection', 'database', 'postgres', 'limits', 'hindsight'],
  },
  {
    id: 'mem-redis',
    title: 'Redis Cache Deserialization Anomaly',
    category: 'memory',
    subtitle: 'Mitigation: flush stale keys, update schema migration parser',
    url: '/memory?q=redis',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['redis', 'deserialization', 'cache', 'keys', 'schema', 'parser'],
  },
  {
    id: 'mem-thread',
    title: 'Thread Pool Saturation & Deadlock',
    category: 'memory',
    subtitle: 'Mitigation: adjust thread worker concurrency, enforce timeouts',
    url: '/memory?q=thread',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['thread', 'deadlock', 'saturation', 'workers', 'concurrency'],
  },
  {
    id: 'mem-kafka',
    title: 'Kafka Consumer Group Rebalance Lag',
    category: 'memory',
    subtitle: 'Mitigation: tune session.timeout.ms and max.poll.interval',
    url: '/memory?q=kafka',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['kafka', 'consumer', 'rebalance', 'lag', 'streaming', 'partitions'],
  },
  {
    id: 'mem-oom',
    title: 'Kubernetes OOMKilled Container Eviction',
    category: 'memory',
    subtitle: 'Mitigation: increase memory limits to 2Gi, tune heap allocation GC',
    url: '/memory?q=oom',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['oom', 'oomkilled', 'kubernetes', 'memory', 'container', 'eviction', 'limits'],
  },
  {
    id: 'mem-rate-limit',
    title: 'Payment Gateway Rate Limiting & 429 Cascades',
    category: 'memory',
    subtitle: 'Mitigation: enable exponential jitter backoff and circuit breaker',
    url: '/memory?q=rate',
    badge: 'Proven Fix',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['rate limit', '429', 'circuit breaker', 'backoff', 'gateway', 'retry'],
  },

  // -------------------------------------------------------------
  // Reports & Postmortems
  // -------------------------------------------------------------
  {
    id: 'rep-1090',
    title: 'INC-1090 Executive Postmortem Report',
    category: 'report',
    subtitle: 'Full root-cause audit, timeline replay, and architectural remediations',
    url: '/reports',
    badge: 'Postmortem',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    keywords: ['report', 'postmortem', 'inc-1090', 'audit', 'checkout', 'executive'],
  },
  {
    id: 'rep-1089',
    title: 'INC-1089 Notification Latency Postmortem',
    category: 'report',
    subtitle: 'Third-party SMS provider latency spike during flash campaign',
    url: '/reports',
    badge: 'Postmortem',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    keywords: ['report', 'postmortem', 'inc-1089', 'sms', 'notification', 'campaign'],
  },
  {
    id: 'rep-sla',
    title: 'Monthly Reliability & MTTR Compliance Report',
    category: 'report',
    subtitle: '99.98% SLA compliance, error budget burn rates, and MTTR velocity',
    url: '/reports',
    badge: 'Compliance',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    keywords: ['sla', 'compliance', 'uptime', 'budget', 'mttr', 'monthly', 'report'],
  },

  // -------------------------------------------------------------
  // Analytics & SLA Metrics
  // -------------------------------------------------------------
  {
    id: 'metric-mttr',
    title: 'Mean Time to Resolution (MTTR) Analysis',
    category: 'analytics',
    subtitle: 'Real-time velocity breakdown across SEV-1, SEV-2, and SEV-3 tiers',
    url: '/analytics',
    badge: 'Analytics',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    keywords: ['mttr', 'mean time', 'resolution', 'velocity', 'analytics', 'charts'],
  },
  {
    id: 'metric-patterns',
    title: 'Recurring Failure Pattern Engine',
    category: 'analytics',
    subtitle: 'Autonomous pattern cluster detection across microservice boundaries',
    url: '/analytics',
    badge: 'AI Pattern',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    keywords: ['patterns', 'recurring', 'clusters', 'anomalies', 'correlations'],
  },
  {
    id: 'metric-severity',
    title: 'Incident Severity Distribution Trends',
    category: 'analytics',
    subtitle: 'Monthly distribution comparison of critical outages and warning events',
    url: '/analytics',
    badge: 'Analytics',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    keywords: ['distribution', 'severity', 'trends', 'volume', 'incidents'],
  },

  // -------------------------------------------------------------
  // Actions & Quick Execution
  // -------------------------------------------------------------
  {
    id: 'action-create',
    title: 'Create New Incident',
    category: 'action',
    subtitle: 'Declare an active operational incident with severity & service tag',
    url: '/incidents',
    badge: 'Action',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    keywords: ['create', 'new incident', 'declare', 'outage', 'report issue', 'action'],
  },
  {
    id: 'action-probe',
    title: 'Run Server Health Probe',
    category: 'action',
    subtitle: 'Execute live diagnostics on Hindsight Cloud, AI reasoning, and DB',
    url: '/settings',
    badge: 'Diagnostics',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    keywords: ['probe', 'health', 'diagnostics', 'test connection', 'server check'],
  },
  {
    id: 'action-demo',
    title: 'Launch Proof of Learning Demo',
    category: 'action',
    subtitle: 'Step through the 10-phase Hindsight memory learning experience',
    url: '/demo',
    badge: 'Simulation',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    keywords: ['demo', 'launch', 'run demo', 'simulation', 'hindsight loop'],
  },
  {
    id: 'action-export',
    title: 'Export Postmortem Report PDF',
    category: 'action',
    subtitle: 'Generate and download executive postmortem documentation',
    url: '/reports',
    badge: 'Export',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    keywords: ['export', 'download', 'pdf', 'postmortem', 'generate'],
  },
];

export function HeaderSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveIncidents, setLiveIncidents] = useState<SearchItem[]>([]);
  const [historyItems, setHistoryItems] = useState<string[]>(DEFAULT_HISTORY);
  const [isMounted, setIsMounted] = useState(false);

  // Safe client mounting & Load history from localStorage
  useEffect(() => {
    setIsMounted(true);
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

  const saveHistory = useCallback((items: string[]) => {
    setHistoryItems(items);
    try {
      localStorage.setItem('recall_search_history', JSON.stringify(items));
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

  // Fetch live incidents from database
  useEffect(() => {
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
            service: inc.service,
            subtitle: `Service: ${inc.service} • Status: ${inc.status}`,
            url: `/incidents/${inc.id}`,
            badge: inc.severity,
            badgeColor:
              inc.severity === 'SEV-1'
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : inc.severity === 'SEV-2'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            keywords: [inc.id, inc.service, inc.status, inc.severity, 'incident'],
          }));
          setLiveIncidents(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Escape key handler to close search dropdown from anywhere
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalEscape);
    return () => window.removeEventListener('keydown', handleGlobalEscape);
  }, [isOpen]);

  // Combine static and live items
  const allItems = useMemo(() => {
    return [...liveIncidents, ...COMPREHENSIVE_SEARCH_ITEMS];
  }, [liveIncidents]);

  // Fast Searching Algorithm: Multi-field sub-millisecond scoring
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeCategory !== 'all') {
      items = items.filter((item) => item.category === activeCategory);
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return items.slice(0, 10);
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);

    // Scoring engine
    const scored = items
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const subtitleLower = (item.subtitle || '').toLowerCase();
        const badgeLower = (item.badge || '').toLowerCase();
        const idLower = item.id.toLowerCase();
        const serviceLower = (item.service || '').toLowerCase();
        const categoryLower = item.category.toLowerCase();
        const keywords = item.keywords || [];

        // 1. Exact match bonuses
        if (titleLower === trimmed || idLower === trimmed) {
          score += 500;
        } else if (titleLower.startsWith(trimmed)) {
          score += 250;
        } else if (idLower.includes(trimmed)) {
          score += 200;
        } else if (serviceLower.includes(trimmed)) {
          score += 180;
        } else if (categoryLower.startsWith(trimmed)) {
          score += 140;
        }

        // 2. Token overlap across all fields
        let matchedTokensCount = 0;
        for (const token of tokens) {
          let tokenFound = false;
          if (titleLower.includes(token)) {
            score += 60;
            tokenFound = true;
          }
          if (idLower.includes(token)) {
            score += 50;
            tokenFound = true;
          }
          if (serviceLower.includes(token)) {
            score += 45;
            tokenFound = true;
          }
          if (badgeLower.includes(token)) {
            score += 35;
            tokenFound = true;
          }
          if (subtitleLower.includes(token)) {
            score += 25;
            tokenFound = true;
          }
          if (categoryLower.includes(token)) {
            score += 30;
            tokenFound = true;
          }
          for (const kw of keywords) {
            if (kw.toLowerCase().includes(token)) {
              score += 40;
              tokenFound = true;
              break;
            }
          }

          if (tokenFound) matchedTokensCount++;
        }

        // 3. Fuzzy sequence matching for acronyms (e.g. 'jwt', 'mttr', 'oom', 'db')
        if (trimmed.length >= 2) {
          let tIdx = 0;
          for (let i = 0; i < titleLower.length && tIdx < trimmed.length; i++) {
            if (titleLower[i] === trimmed[tIdx]) tIdx++;
          }
          if (tIdx === trimmed.length) score += 20;
        }

        // Only keep if at least one token matched
        if (matchedTokensCount === 0 && score === 0) {
          return { item, score: 0 };
        }

        // Quality boosts
        if (item.badge === 'SEV-1') score += 20;
        if (item.badge === 'Proven Fix') score += 15;
        if (item.category === 'action') score += 10;

        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    return scored.slice(0, 25);
  }, [allItems, activeCategory, query]);

  // Reset selected index when query or items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      addSearchToHistory(item.title.replace(/^INC-\d+:\s*/, ''));
      setIsOpen(false);
      router.push(item.url);
    },
    [addSearchToHistory, router]
  );

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    addSearchToHistory(term);
    inputRef.current?.focus();
  };

  // Keyboard navigation inside input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const maxIndex = query ? filteredItems.length - 1 : historyItems.length - 1;
      if (maxIndex >= 0) {
        setSelectedIndex((prev) => (prev + 1 <= maxIndex ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIndex = query ? filteredItems.length - 1 : historyItems.length - 1;
      if (maxIndex >= 0) {
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxIndex));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query && filteredItems.length > 0) {
        const target = filteredItems[selectedIndex] || filteredItems[0];
        if (target) handleSelect(target);
      } else if (!query && historyItems.length > 0) {
        const term = historyItems[selectedIndex] || historyItems[0];
        if (term) handleSelectHistory(term);
      }
    }
  };

  const getCategoryIcon = (category: SearchCategory) => {
    switch (category) {
      case 'incident':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
      case 'service':
        return <Server className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />;
      case 'memory':
        return <Brain className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
      case 'report':
        return <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'analytics':
        return <BarChart3 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
      case 'action':
        return <Zap className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
      case 'page':
        return <Home className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
    }
  };

  const getCategoryTag = (category: SearchCategory) => {
    switch (category) {
      case 'incident':
        return { label: 'Incident', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'service':
        return { label: 'Service', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'memory':
        return { label: 'Hindsight', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'report':
        return { label: 'Postmortem', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'analytics':
        return { label: 'Metrics', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'action':
        return { label: 'Action', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      case 'page':
        return { label: 'Navigation', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    }
  };

  return (
    <>
      {/* Full-Page Background Blur Overlay portaled to document.body */}
      {isMounted && isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* Search Bar Container */}
      <div ref={containerRef} className="relative z-50 w-full min-w-0 max-w-xl flex-1">
        {/* Search Input Bar with Rounded-Squared Shape & Glowing Accent */}
        <div
          className={`group w-full flex items-center justify-between bg-[#0e111a] border rounded-xl px-3.5 py-2 text-xs transition-all duration-200 shadow-sm ${
            isOpen
              ? 'border-red-500/70 bg-[#121624] shadow-[0_0_25px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
              : 'border-[#202738] hover:border-red-500/40 hover:bg-[#141826]'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search
              className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
                isOpen ? 'text-red-400 animate-pulse' : 'text-slate-500 group-hover:text-red-400'
              }`}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search RECALL..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-[#1f2638] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181d2a] border border-[#232a3d] text-[10px] font-mono text-slate-400 group-hover:border-red-500/30 group-hover:text-red-300 transition-colors select-none">
                <span className="text-[11px]">⌘</span> K
              </span>
            )}
          </div>
        </div>

        {/* History & Multi-Category Search Dropdown Box (100% Solid Opaque Background) */}
        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[#0c0f18] border border-[#222a3d] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.98),0_0_40px_rgba(239,68,68,0.2)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
            {/* Category Filter Pills (All Categories Search) */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#090b12] border-b border-[#1c2232] overflow-x-auto text-[11px] scrollbar-none">
              <span className="text-[10px] uppercase font-mono text-slate-500 mr-1 flex-shrink-0">
                Filter:
              </span>
              {[
                { id: 'all', label: 'All Results' },
                { id: 'incident', label: 'Incidents' },
                { id: 'service', label: 'Services' },
                { id: 'memory', label: 'Hindsight Memory' },
                { id: 'report', label: 'Reports' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'action', label: 'Actions' },
                { id: 'page', label: 'Navigation' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeCategory === tab.id
                      ? 'bg-red-500/25 text-red-300 border border-red-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#141824]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* History Section (When query is empty and filter is 'all') */}
            {!query && activeCategory === 'all' && (
              <div className="p-3.5 space-y-3 bg-[#0c0f18]">
                {/* History Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                      Recent Search History
                    </span>
                    {isMounted && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#161c2b] text-[10px] text-slate-400 font-mono border border-[#202738]">
                        {historyItems.length}
                      </span>
                    )}
                  </div>
                  {isMounted && historyItems.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                </div>

                {/* History Items List */}
                {isMounted && historyItems.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No recent searches. Try searching across incidents, services, or playbooks!
                  </div>
                ) : (
                  <div className="space-y-1">
                    {historyItems.map((term, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectHistory(term)}
                          className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#182035] border border-red-500/50 text-white shadow-sm'
                              : 'bg-[#121624] hover:bg-[#182035] text-slate-200 hover:text-white border border-[#1e2638] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Clock
                              className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                                isSelected ? 'text-red-400' : 'text-slate-500 group-hover:text-red-400'
                              }`}
                            />
                            <span className="truncate font-medium">{term}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] text-slate-500 group-hover:text-slate-400 flex items-center gap-1 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>Search</span>
                              <CornerDownLeft className="w-2.5 h-2.5" />
                            </span>
                            <button
                              type="button"
                              onClick={(e) => removeHistoryItem(term, e)}
                              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Remove from history"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Jump Suggestions */}
                <div className="pt-2.5 border-t border-[#1c2232]">
                  <div className="text-[10px] uppercase font-mono text-slate-500 mb-2 px-1 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Suggested Jumps
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SUGGESTIONS.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectHistory(sug.query)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141926] hover:bg-[#1c2336] border border-[#20283c] hover:border-red-500/40 text-xs text-slate-300 hover:text-white transition-all duration-150 cursor-pointer group"
                      >
                        <span className="font-medium text-[11px]">{sug.label}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e2638] text-slate-400 group-hover:text-red-300 font-mono">
                          {sug.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fast Search Results List Across All Categories */}
            {(query || activeCategory !== 'all') && (
              <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 bg-[#0c0f18]">
                {filteredItems.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <Search className="w-7 h-7 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No results for &ldquo;{query}&rdquo;</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Try searching &quot;INC-1090&quot;, &quot;checkout&quot;, &quot;pool&quot;, &quot;redis&quot;, &quot;postmortem&quot;, or &quot;probe&quot;
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item, index) => {
                    const isSelected = selectedIndex === index;
                    const catTag = getCategoryTag(item.category);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[#182035] border border-red-500/50 shadow-sm translate-x-0.5 text-white'
                            : 'bg-[#111522] hover:bg-[#171e30] border border-[#1c2336] hover:border-slate-600 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                              isSelected ? 'bg-red-500/20 text-red-400' : 'bg-[#1c2234] text-slate-400'
                            }`}
                          >
                            {getCategoryIcon(item.category)}
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                {item.title}
                              </span>

                              {/* Category Tag (when searching All) */}
                              {activeCategory === 'all' && catTag && (
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase flex-shrink-0 ${catTag.color}`}
                                >
                                  {catTag.label}
                                </span>
                              )}

                              {item.badge && (
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase flex-shrink-0 ${
                                    item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-400 truncate leading-snug">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <ArrowRight
                          className={`w-3.5 h-3.5 flex-shrink-0 ml-2 transition-all ${
                            isSelected
                              ? 'text-red-400 translate-x-0.5 opacity-100'
                              : 'text-slate-600 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Footer Status & Keyboard Navigation Hint */}
            <div className="px-3.5 py-2 bg-[#090b12] border-t border-[#1c2232] flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>RECALL Search Engine</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">↑↓ navigate</span>
                <span>•</span>
                <span>↵ select</span>
                <span>•</span>
                <span>esc close</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
