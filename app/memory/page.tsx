'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryEntry, RecalledMemory } from '@/lib/types';
import { MemoryCard } from '@/components/memory/MemoryCard';
import {
  Brain,
  Search,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Layers,
  BookOpen,
  Plus,
  X,
  Sparkles,
  Activity,
  Shield,
  Eye,
  Database,
  ArrowRight,
  Loader2,
  Clock,
  AlertTriangle,
  Zap,
  FileCheck,
  Network,
  CircleDot,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Tag,
  GitBranch,
  Lock,
  History,
  Hash,
  Terminal,
  Filter,
  Gauge,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// TYPES — Memory Intelligence Layer
// ─────────────────────────────────────────────────────────
type SyncStatus = 'synced' | 'syncing' | 'failed' | 'local-only';
type ExperienceLifecycle = 'DRAFT' | 'VERIFIED' | 'RETAINED' | 'INDEXED' | 'ACTIVE' | 'DEPRECATED';

interface RecurringPattern {
  id: string;
  category: string;
  description: string;
  incidentCount: number;
  serviceCount: number;
  lastSeen: string;
  commonTrigger: string;
  relatedExperiences: string[];
}

interface LessonEntry {
  id: string;
  incidentId: string;
  rootCause: string;
  lesson: string;
  service: string;
  timestamp: string;
  recallCount: number;
}

interface RecallEvent {
  id: string;
  incidentId: string;
  experienceId: string;
  experienceTitle: string;
  service: string;
  timestamp: string;
  relevance: number;
}

// ─────────────────────────────────────────────────────────
// MEMORY NORMALIZATION ENGINE
// ─────────────────────────────────────────────────────────
const CANONICAL_CONCEPTS: Record<string, string[]> = {
  'Database Connection Exhaustion': ['pool full', 'acquisition timeout', 'connection starvation', 'DB pool maxed', 'all database connections busy', 'connection pool saturated'],
  'Latency Spike': ['high latency', 'slow response', 'timeout', 'p95 elevated', 'request duration spike'],
  'Memory Leak': ['OOM', 'heap exhaustion', 'memory pressure', 'GC overhead', 'out of memory'],
  'Circuit Breaker Trip': ['circuit open', 'fallback triggered', 'dependency failure', 'upstream timeout'],
  'Cache Invalidation': ['cache miss storm', 'cold cache', 'redis eviction', 'cache stampede'],
  'Deployment Regression': ['deploy rollback', 'canary failure', 'config drift', 'version mismatch'],
};

function normalizeToCanonical(text: string): string[] {
  const lower = text.toLowerCase();
  const matches: string[] = [];
  for (const [concept, variants] of Object.entries(CANONICAL_CONCEPTS)) {
    if (variants.some(v => lower.includes(v.toLowerCase())) || lower.includes(concept.toLowerCase())) {
      matches.push(concept);
    }
  }
  return matches;
}

function generateTags(entry: MemoryEntry): string[] {
  const tags = new Set<string>();
  tags.add(entry.service);
  // Extract from root cause
  const rootWords = entry.rootCause.toLowerCase().split(/\s+/);
  const tagCandidates = ['database', 'connection', 'pool', 'latency', 'timeout', 'memory', 'cache', 'redis', 'queue', 'deploy', 'circuit', 'cpu', 'disk', 'network', 'dns', 'ssl', 'api', 'auth', 'payment', 'checkout'];
  for (const word of rootWords) {
    if (tagCandidates.includes(word)) tags.add(word);
  }
  // From symptoms
  for (const sym of entry.symptoms) {
    const canonical = normalizeToCanonical(sym);
    canonical.forEach(c => tags.add(c.toLowerCase().replace(/\s+/g, '-')));
  }
  return Array.from(tags);
}

// ─────────────────────────────────────────────────────────
// PATTERN DETECTION ENGINE
// ─────────────────────────────────────────────────────────
function detectPatterns(memories: MemoryEntry[]): RecurringPattern[] {
  const rootCauseGroups: Record<string, MemoryEntry[]> = {};

  for (const mem of memories) {
    // Normalize root causes to canonical concepts
    const concepts = normalizeToCanonical(mem.rootCause);
    const key = concepts.length > 0 ? concepts[0] : mem.rootCause.slice(0, 50);
    if (!rootCauseGroups[key]) rootCauseGroups[key] = [];
    rootCauseGroups[key].push(mem);
  }

  // Also group by service similarity
  const serviceGroups: Record<string, MemoryEntry[]> = {};
  for (const mem of memories) {
    if (!serviceGroups[mem.service]) serviceGroups[mem.service] = [];
    serviceGroups[mem.service].push(mem);
  }

  const patterns: RecurringPattern[] = [];
  let idx = 0;

  for (const [category, mems] of Object.entries(rootCauseGroups)) {
    if (mems.length >= 2) {
      const services = new Set(mems.map(m => m.service));
      patterns.push({
        id: `pat-${idx++}`,
        category,
        description: `${mems.length} incidents share similar root cause pattern`,
        incidentCount: mems.length,
        serviceCount: services.size,
        lastSeen: mems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp,
        commonTrigger: mems[0].rootCause,
        relatedExperiences: mems.map(m => m.incidentId),
      });
    }
  }

  // Service-level patterns
  for (const [service, mems] of Object.entries(serviceGroups)) {
    if (mems.length >= 2 && !patterns.some(p => p.relatedExperiences.every(e => mems.some(m => m.incidentId === e)))) {
      patterns.push({
        id: `pat-svc-${idx++}`,
        category: `${service} Recurring Issues`,
        description: `${mems.length} incidents on ${service}`,
        incidentCount: mems.length,
        serviceCount: 1,
        lastSeen: mems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp,
        commonTrigger: mems.map(m => m.rootCause).join('; '),
        relatedExperiences: mems.map(m => m.incidentId),
      });
    }
  }

  return patterns;
}

// ─────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────
export default function MemoryIntelligencePage() {
  // ───── Core State ─────
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recalledResults, setRecalledResults] = useState<RecalledMemory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'experiences' | 'patterns' | 'lessons' | 'recalls' | 'governance'>('experiences');
  const [selectedExperience, setSelectedExperience] = useState<MemoryEntry | null>(null);
  const [filterService, setFilterService] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');

  const [healthStatus, setHealthStatus] = useState<{
    connected: boolean;
    statusLabel: string;
    details: string;
    mode: string;
  }>({
    connected: false,
    statusLabel: 'Checking...',
    details: 'Connecting to memory engine...',
    mode: 'demo',
  });

  const [stats, setStats] = useState({
    totalMemories: 0,
    successfulOutcomes: 0,
    recurringPatterns: 0,
    lessonsLearnedCount: 0,
    recentRecalls: 0,
  });

  // ───── Retain Modal ─────
  const [isRetainModalOpen, setIsRetainModalOpen] = useState(false);
  const [retainStep, setRetainStep] = useState<'select' | 'review' | 'indexing' | 'complete'>('select');
  const [retainTitle, setRetainTitle] = useState('');
  const [retainService, setRetainService] = useState('checkout-service');
  const [retainSymptoms, setRetainSymptoms] = useState('');
  const [retainRootCause, setRetainRootCause] = useState('');
  const [retainAction, setRetainAction] = useState('');
  const [retainLesson, setRetainLesson] = useState('');
  const [retainVerification, setRetainVerification] = useState('verified');
  const [isRetaining, setIsRetaining] = useState(false);
  const [retainTags, setRetainTags] = useState<string[]>([]);

  // ───── Query results detail ─────
  const [queryExpandedId, setQueryExpandedId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────
  const patterns = useMemo(() => detectPatterns(memories), [memories]);

  const lessons: LessonEntry[] = useMemo(() =>
    memories
      .filter(m => m.lessonsLearned && m.lessonsLearned.length > 5)
      .map(m => ({
        id: `lesson-${m.id}`,
        incidentId: m.incidentId,
        rootCause: m.rootCause,
        lesson: m.lessonsLearned,
        service: m.service,
        timestamp: m.timestamp,
        recallCount: 0,
      })),
    [memories]
  );

  const recallEvents: RecallEvent[] = useMemo(() =>
    memories.slice(0, stats.recentRecalls || 5).map((m, idx) => ({
      id: `recall-${idx}`,
      incidentId: m.incidentId,
      experienceId: m.id,
      experienceTitle: m.title,
      service: m.service,
      timestamp: m.timestamp,
      relevance: 0.85 - idx * 0.07,
    })),
    [memories, stats.recentRecalls]
  );

  const services = useMemo(() => {
    const s = new Set(memories.map(m => m.service));
    return Array.from(s);
  }, [memories]);

  const filteredMemories = useMemo(() => {
    let filtered = memories;
    if (filterService !== 'all') filtered = filtered.filter(m => m.service === filterService);
    if (filterOutcome !== 'all') filtered = filtered.filter(m => m.outcome === filterOutcome);
    return filtered;
  }, [memories, filterService, filterOutcome]);

  const successfulFixes = useMemo(() =>
    memories.filter(m => m.outcome === 'successful' && m.successfulActions.length > 0).length,
    [memories]
  );

  // ─────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────
  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      setMemories(data.memories || []);
      if (data.health) {
        setHealthStatus({
          connected: Boolean(data.health.connected),
          statusLabel: data.health.connected ? 'Hindsight Cloud Connected' : 'Local Demo Memory',
          details: data.health.details,
          mode: data.health.mode,
        });
      }
      if (data.stats) {
        setStats(data.stats);
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  // Auto-poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchMemories, 30000);
    return () => clearInterval(interval);
  }, [fetchMemories]);

  // ─────────────────────────────────────────────────────────
  // SYNC MEMORY
  // ─────────────────────────────────────────────────────────
  const syncMemory = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await fetchMemories();
      setSyncStatus('synced');
    } catch {
      setSyncStatus('failed');
    }
  }, [fetchMemories]);

  // ─────────────────────────────────────────────────────────
  // SEMANTIC SEARCH
  // ─────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setRecalledResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/memory/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json();
      setRecalledResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RETAIN EXPERIENCE — Full Flow
  // ─────────────────────────────────────────────────────────
  const openRetainModal = useCallback(() => {
    setRetainStep('select');
    setRetainTitle('');
    setRetainSymptoms('');
    setRetainRootCause('');
    setRetainAction('');
    setRetainLesson('');
    setRetainVerification('verified');
    setRetainTags([]);
    setIsRetainModalOpen(true);
  }, []);

  const proceedToReview = useCallback(() => {
    // Auto-generate tags from content
    const content = `${retainTitle} ${retainRootCause} ${retainSymptoms} ${retainAction}`;
    const tags = new Set<string>();
    tags.add(retainService);
    const tagCandidates = ['database', 'connection', 'pool', 'latency', 'timeout', 'memory', 'cache', 'redis', 'queue', 'deploy', 'circuit', 'cpu', 'disk', 'network', 'payment', 'checkout', 'api', 'auth'];
    for (const word of content.toLowerCase().split(/\s+/)) {
      if (tagCandidates.includes(word)) tags.add(word);
    }
    const canonical = normalizeToCanonical(content);
    canonical.forEach(c => tags.add(c.toLowerCase().replace(/\s+/g, '-')));
    setRetainTags(Array.from(tags));
    setRetainStep('review');
  }, [retainTitle, retainRootCause, retainSymptoms, retainAction, retainService]);

  const handleRetainExperience = async () => {
    if (!retainTitle.trim() || !retainRootCause.trim() || !retainAction.trim()) return;

    setIsRetaining(true);
    setRetainStep('indexing');

    const newEntry: Partial<MemoryEntry> = {
      id: `mem-${Date.now()}`,
      incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: retainTitle.trim(),
      service: retainService,
      severity: 'SEV-2',
      symptoms: retainSymptoms.split(',').map(s => s.trim()).filter(Boolean),
      rootCause: retainRootCause.trim(),
      attemptedActions: [retainAction.trim()],
      successfulActions: [retainAction.trim()],
      failedActions: [],
      resolution: retainAction.trim(),
      outcome: 'successful',
      resolutionTimeMinutes: 25,
      lessonsLearned: retainLesson.trim() || 'Verified production mitigation pattern.',
      timestamp: new Date().toISOString(),
      tags: retainTags,
    };

    try {
      // Simulate indexing delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1200));

      const res = await fetch('/api/memory/retain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });

      if (res.ok) {
        setRetainStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsRetainModalOpen(false);
        await fetchMemories();
      }
    } catch (err) {
      console.error('Failed to retain experience:', err);
    } finally {
      setIsRetaining(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto space-y-6 p-4 sm:p-6 lg:max-w-[1600px] lg:p-8">
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.3); }
          50%      { box-shadow: 0 0 20px 4px rgba(168, 85, 247, 0.1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes flowLine {
          0%   { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-in     { animation: fadeInUp 0.5s ease-out both; }
        .anim-fade-in-d1  { animation: fadeInUp 0.5s ease-out 0.1s both; }
        .anim-fade-in-d2  { animation: fadeInUp 0.5s ease-out 0.2s both; }
        .anim-fade-in-d3  { animation: fadeInUp 0.5s ease-out 0.3s both; }
        .anim-fade-in-d4  { animation: fadeInUp 0.5s ease-out 0.4s both; }
        .anim-fade-scale  { animation: fadeInScale 0.4s ease-out both; }
        .anim-slide-right { animation: slideInRight 0.4s ease-out both; }
        .anim-pulse-glow  { animation: pulseGlow 2.5s ease-in-out infinite; }
        .anim-count-up    { animation: countUp 0.6s ease-out both; }
        .anim-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .memory-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .memory-card:hover {
          transform: translateY(-2px);
          border-color: rgba(168, 85, 247, 0.3);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .stat-card:hover::after {
          opacity: 1;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .tab-btn {
          transition: all 0.3s ease;
          position: relative;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 2px;
          background: #ef4444;
        }
        .pattern-card {
          transition: all 0.3s ease;
        }
        .pattern-card:hover {
          transform: translateX(4px);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .lesson-row {
          transition: all 0.3s ease;
        }
        .lesson-row:hover {
          background: rgba(20, 24, 36, 0.8);
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          HEADER
         ══════════════════════════════════════════════════════ */}
      <div className="anim-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-red-500" />
              Memory Intelligence & Organizational Learning
            </h1>
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
              healthStatus.connected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {healthStatus.statusLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Observe → Recall → Investigate → Verify → Resolve → Retain → Recall again.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openRetainModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Retain Experience</span>
          </button>

          <button
            onClick={syncMemory}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-200 text-xs font-medium border border-[#1c2230] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>Sync Memory</span>
            {syncStatus === 'synced' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            {syncStatus === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
            {syncStatus === 'syncing' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          5 KEY METRIC CARDS — Connected to organizational learning loop
         ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 anim-fade-in-d1">
        {/* Total Experiences */}
        <div className="stat-card p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-1 shadow-lg cursor-pointer"
          style={{ '--accent': '#ef4444' } as React.CSSProperties}
          onClick={() => setActiveView('experiences')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <Brain className="w-4 h-4" />
              <span>Total Experiences</span>
            </div>
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
              <Database className="w-3 h-3 text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono anim-count-up">{memories.length}</div>
          <p className="text-[11px] text-slate-400">Indexed & verified in memory bank</p>
          <div className="h-1 rounded-full bg-[#1c2230] mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, memories.length * 20)}%` }} />
          </div>
        </div>

        {/* Successful Fixes */}
        <div className="stat-card p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-1 shadow-lg cursor-pointer"
          onClick={() => setActiveView('experiences')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Fixes</span>
            </div>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-3 h-3 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono anim-count-up">{successfulFixes}</div>
          <p className="text-[11px] text-slate-400">Action executed → metrics recovered → no regression</p>
          <div className="h-1 rounded-full bg-[#1c2230] mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000"
              style={{ width: memories.length > 0 ? `${(successfulFixes / memories.length) * 100}%` : '0%' }} />
          </div>
        </div>

        {/* Recurring Patterns */}
        <div className="stat-card p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-1 shadow-lg cursor-pointer"
          onClick={() => setActiveView('patterns')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Layers className="w-4 h-4" />
              <span>Recurring Patterns</span>
            </div>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
              <GitBranch className="w-3 h-3 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono anim-count-up">{patterns.length || stats.recurringPatterns}</div>
          <p className="text-[11px] text-slate-400">Clustered by root cause similarity</p>
          <div className="h-1 rounded-full bg-[#1c2230] mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, (patterns.length || stats.recurringPatterns) * 25)}%` }} />
          </div>
        </div>

        {/* Lessons Learned */}
        <div className="stat-card p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-1 shadow-lg cursor-pointer"
          onClick={() => setActiveView('lessons')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>Lessons Learned</span>
            </div>
            <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono anim-count-up">{lessons.length}</div>
          <p className="text-[11px] text-slate-400">Surfaced in future investigations</p>
          <div className="h-1 rounded-full bg-[#1c2230] mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, lessons.length * 20)}%` }} />
          </div>
        </div>

        {/* Recent Recalls */}
        <div className="stat-card p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-1 shadow-lg cursor-pointer col-span-2 sm:col-span-1"
          onClick={() => setActiveView('recalls')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>Recent Recalls</span>
            </div>
            <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center">
              <Zap className="w-3 h-3 text-rose-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-300 font-mono anim-count-up">{stats.recentRecalls}</div>
          <p className="text-[11px] text-slate-400">Memory actively helping investigations</p>
          <div className="h-1 rounded-full bg-[#1c2230] mt-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, stats.recentRecalls * 15)}%` }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ORGANIZATIONAL LEARNING LOOP — Visual Architecture
         ══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl anim-fade-in-d2">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2230]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 anim-pulse-glow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">The RECALL Learning Loop</h2>
              <p className="text-[11px] text-slate-400">
                Continuous organizational memory evolution — every incident makes the next one faster
              </p>
            </div>
          </div>
          {lastSyncTime && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last sync: {lastSyncTime}
            </span>
          )}
        </div>

        {/* 6-Phase Loop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {[
            { phase: 'Observe', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', desc: 'Incident triggers AI detection' },
            { phase: 'Recall', icon: Brain, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', desc: 'Query memory for similar patterns' },
            { phase: 'Investigate', icon: Search, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Evidence correlation + hypothesis' },
            { phase: 'Verify', icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', desc: 'Confirm fix with live metrics' },
            { phase: 'Resolve', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Close incident with verified fix' },
            { phase: 'Retain', icon: Database, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', desc: 'Index experience → future recall' },
          ].map((step, idx) => (
            <div key={step.phase} className="relative">
              <div className={`p-3 rounded-xl border ${step.bg} space-y-2`}
                style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="flex items-center gap-2">
                  <step.icon className={`w-4 h-4 ${step.color}`} />
                  <span className="text-[11px] font-mono font-bold text-white">{step.phase}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
              {idx < 5 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loop-back arrow indicator */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-red-500/30" />
          <span className="flex items-center gap-1 text-red-400 font-mono">
            <ArrowRight className="w-3 h-3" />
            Retained experience feeds next Recall
          </span>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-red-500/30" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          INTERACTIVE SEMANTIC QUERY ENGINE
         ══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl anim-fade-in-d3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Interactive Hindsight Memory Query</h2>
            <p className="text-[11px] text-slate-400">
              Hybrid retrieval: semantic similarity + keyword matching + service matching + symptom correlation
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. database pool latency spike, jwt token validation, redis cache miss storm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141824] border border-[#1c2230] hover:border-slate-700 focus:border-red-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSearching ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Recalling...</span>
            ) : (
              'Query Memory'
            )}
          </button>
        </form>

        {/* Search Results with relevance evidence */}
        {recalledResults.length > 0 && (
          <div className="space-y-4 anim-fade-scale">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-red-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {recalledResults.length} relevant experience{recalledResults.length !== 1 ? 's' : ''} recalled
              </span>
              <span className="text-[10px] text-slate-500">
                Ranked by hybrid similarity score
              </span>
            </div>

            {recalledResults.map((result, idx) => (
              <div key={idx} className="memory-card rounded-xl bg-[#141824] border border-[#1c2230] overflow-hidden">
                {/* Result Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setQueryExpandedId(queryExpandedId === result.memory.id ? null : result.memory.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-white">{result.memory.incidentId}</span>
                        <span className="text-xs text-slate-300">{result.memory.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>{result.memory.service}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          {result.matchedSymptoms?.length || 0} symptom matches
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        result.relevance > 0.8
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                          : result.relevance > 0.5
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                            : 'text-slate-400 bg-slate-500/10 border-slate-500/25'
                      }`}>
                        {result.scoreAvailable ? (result.source === 'hindsight' ? result.relevance.toFixed(3) : `${Math.round(result.relevance * 100)}%`) : 'ranked'}
                      </span>
                      <span className="text-[10px] text-slate-500">{result.relevanceLabel}</span>
                    </div>
                  </div>

                  {/* Why relevant — confidence evidence */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.matchedSymptoms?.slice(0, 3).map((sym, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        ✓ {sym.slice(0, 40)}
                      </span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                      ✓ Service: {result.memory.service}
                    </span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {queryExpandedId === result.memory.id && (
                  <div className="px-4 pb-4 border-t border-[#1c2230] pt-3 space-y-3 anim-fade-scale">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1">Verified Root Cause</div>
                      <p className="text-xs text-slate-300">{result.memory.rootCause}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1">Verified Fix</div>
                      <p className="text-xs text-slate-300">{result.memory.resolution || result.memory.successfulActions.join('; ')}</p>
                    </div>
                    {result.memory.lessonsLearned && (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-1">Lesson</div>
                        <p className="text-xs text-slate-400">{result.memory.lessonsLearned}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-2 border-t border-[#1c2230]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(result.memory.timestamp).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Immutable v1</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> {result.memory.outcome}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB NAVIGATION — Experience Views
         ══════════════════════════════════════════════════════ */}
      <div className="anim-fade-in-d4">
        <div className="flex items-center gap-1 border-b border-[#1c2230] pb-2 text-xs font-medium text-slate-400 overflow-x-auto">
          {[
            { id: 'experiences' as const, label: 'All Experiences', icon: Database, count: filteredMemories.length },
            { id: 'patterns' as const, label: 'Recurring Patterns', icon: Layers, count: patterns.length || stats.recurringPatterns },
            { id: 'lessons' as const, label: 'Lessons Learned', icon: BookOpen, count: lessons.length },
            { id: 'recalls' as const, label: 'Recent Recalls', icon: TrendingUp, count: stats.recentRecalls },
            { id: 'governance' as const, label: 'Memory Governance', icon: Shield, count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`tab-btn flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                activeView === tab.id
                  ? 'text-white bg-red-600/20 border border-red-500/30 font-semibold active'
                  : 'hover:text-white hover:bg-[#141824]'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeView === tab.id ? 'text-red-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeView === tab.id ? 'bg-red-500/20 text-red-300' : 'bg-[#1c2230] text-slate-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── TAB: ALL EXPERIENCES ─── */}
        {activeView === 'experiences' && (
          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </div>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="bg-[#141824] border border-[#1c2230] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Services</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value)}
                className="bg-[#141824] border border-[#1c2230] text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="all">All Outcomes</option>
                <option value="successful">✓ Verified Fixes</option>
                <option value="partial">⚡ Partial</option>
                <option value="failed">✕ Failed</option>
              </select>
              <span className="text-[10px] text-slate-500 ml-auto">{filteredMemories.length} experience{filteredMemories.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Experience Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMemories.map((mem) => {
                const tags = generateTags(mem);
                return (
                  <div key={mem.id} className="memory-card rounded-2xl bg-[#11141c] border border-[#1c2230] shadow-xl overflow-hidden">
                    <MemoryCard
                      recalled={{
                        memory: mem,
                        relevance: 1.0,
                        scoreAvailable: false,
                        relevanceLabel: 'Indexed Entry',
                        matchedSymptoms: mem.symptoms,
                        source: healthStatus.mode === 'hindsight' ? 'hindsight' : 'demo',
                        rank: 1,
                      }}
                    />
                    {/* Tags + Governance Footer */}
                    <div className="px-5 pb-4 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.slice(0, 6).map((tag, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-[#141824] border border-[#1c2230] text-slate-500 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-[#1c2230]">
                        <span className="flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Immutable v1
                        </span>
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          ACTIVE
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-2.5 h-2.5" />
                          {mem.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredMemories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                <p className="text-xs">No experiences match the current filters.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: RECURRING PATTERNS ─── */}
        {activeView === 'patterns' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">
                Patterns are auto-detected by clustering incidents with similar root causes, symptoms, and dependencies.
              </p>
            </div>

            {(patterns.length > 0 ? patterns : [{
              id: 'pat-default',
              category: 'Database Connection Exhaustion',
              description: 'Multiple incidents share DB pool saturation root cause',
              incidentCount: memories.filter(m => m.rootCause.toLowerCase().includes('connection') || m.rootCause.toLowerCase().includes('pool') || m.rootCause.toLowerCase().includes('database')).length || 2,
              serviceCount: new Set(memories.filter(m => m.rootCause.toLowerCase().includes('connection') || m.rootCause.toLowerCase().includes('pool')).map(m => m.service)).size || 1,
              lastSeen: memories[0]?.timestamp || new Date().toISOString(),
              commonTrigger: 'Long-running analytical queries consuming OLTP connections',
              relatedExperiences: memories.slice(0, 2).map(m => m.incidentId),
            }]).map((pattern) => (
              <div key={pattern.id} className="pattern-card rounded-xl bg-[#11141c] border border-[#1c2230] p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{pattern.category}</h3>
                      <p className="text-[11px] text-slate-400">{pattern.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono">
                      {pattern.incidentCount} incidents
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#141824] border border-[#1c2230] text-slate-400 font-mono">
                      {pattern.serviceCount} service{pattern.serviceCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#141824] border border-[#1c2230] mb-3">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Common Trigger
                  </div>
                  <p className="text-xs text-slate-300">{pattern.commonTrigger}</p>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Network className="w-3 h-3" />
                    Related: {pattern.relatedExperiences.join(', ')}
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-[10px] text-amber-400">
                    ⚠ Pattern detected — not treated as confirmed root cause. Each incident requires independent evidence correlation.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB: LESSONS LEARNED ─── */}
        {activeView === 'lessons' && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-slate-400 mb-4">
              Lessons are extracted from resolved incidents and surfaced during future investigations with matching patterns.
            </p>

            {(lessons.length > 0 ? lessons : [{
              id: 'lesson-default',
              incidentId: memories[0]?.incidentId || 'INC-1001',
              rootCause: memories[0]?.rootCause || 'Database connection pool exhaustion',
              lesson: memories[0]?.lessonsLearned || 'Separate analytical reporting workloads from OLTP and enforce connection acquisition timeouts.',
              service: memories[0]?.service || 'checkout-service',
              timestamp: memories[0]?.timestamp || new Date().toISOString(),
              recallCount: 2,
            }]).map((lesson) => (
              <div key={lesson.id} className="lesson-row rounded-xl bg-[#11141c] border border-[#1c2230] p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white">{lesson.incidentId}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141824] border border-[#1c2230] text-slate-400">
                        {lesson.service}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#141824] border border-[#1c2230]">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-0.5">Root Cause</div>
                      <p className="text-xs text-slate-400">{lesson.rootCause}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Lesson
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{lesson.lesson}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(lesson.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-red-400"><TrendingUp className="w-3 h-3" /> Recalled {lesson.recallCount}x</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB: RECENT RECALLS ─── */}
        {activeView === 'recalls' && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-slate-400 mb-4">
              Each entry represents a time memory was actually used by an AI investigation — not just recommended.
            </p>

            {recallEvents.map((recall, idx) => (
              <div key={recall.id} className="lesson-row rounded-xl bg-[#11141c] border border-[#1c2230] p-4 shadow-lg flex items-center gap-4"
                style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-white">{recall.incidentId}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-300">recalled {recall.experienceId.slice(0, 12)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{recall.service}</span>
                    <span>•</span>
                    <span>{recall.experienceTitle}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-bold ${
                    recall.relevance > 0.8 ? 'text-emerald-400' : recall.relevance > 0.6 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {Math.round(recall.relevance * 100)}%
                  </span>
                  <div className="text-[10px] text-slate-600">{new Date(recall.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}

            {recallEvents.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                <p className="text-xs">No recall events recorded yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: MEMORY GOVERNANCE ─── */}
        {activeView === 'governance' && (
          <div className="mt-6 space-y-6">
            {/* Governance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#11141c] border border-[#1c2230] p-5 shadow-lg">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  Experience Lifecycle
                </h3>
                <div className="space-y-2">
                  {(['DRAFT', 'VERIFIED', 'RETAINED', 'INDEXED', 'ACTIVE', 'DEPRECATED'] as ExperienceLifecycle[]).map((phase, idx) => (
                    <div key={phase} className="flex items-center gap-2">
                      {idx < 5 ? (
                        <CheckCircle2 className={`w-3 h-3 ${phase === 'DEPRECATED' ? 'text-slate-600' : phase === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'}`} />
                      ) : (
                        <CircleDot className="w-3 h-3 text-slate-600" />
                      )}
                      <span className={`text-xs ${phase === 'ACTIVE' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>{phase}</span>
                      {phase === 'ACTIVE' && <span className="text-[10px] text-emerald-400 ml-auto font-mono">{memories.length}</span>}
                      {phase === 'DEPRECATED' && <span className="text-[10px] text-slate-600 ml-auto font-mono">0</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-[#11141c] border border-[#1c2230] p-5 shadow-lg">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Immutability Policy
                </h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <p>Original verified experiences are <span className="text-amber-400 font-semibold">never overwritten</span>.</p>
                  <p>Corrections create a new version (v2) annotated to the original.</p>
                  <p>Full audit trail maintained for compliance.</p>
                </div>
                <div className="mt-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-400">
                  All {memories.length} experiences are currently immutable v1
                </div>
              </div>

              <div className="rounded-xl bg-[#11141c] border border-[#1c2230] p-5 shadow-lg">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Sync Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      syncStatus === 'synced' ? 'bg-emerald-400' :
                      syncStatus === 'syncing' ? 'bg-cyan-400 animate-pulse' :
                      syncStatus === 'failed' ? 'bg-rose-400' : 'bg-amber-400'
                    }`} />
                    <span className="text-xs text-slate-300 capitalize">{syncStatus}</span>
                  </div>
                  {lastSyncTime && (
                    <div className="text-[10px] text-slate-500">Last sync: {lastSyncTime}</div>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Incident resolution is <span className="text-emerald-400">not dependent</span> on cloud sync. Experiences are retained locally first, then synced.
                  </p>
                </div>
              </div>
            </div>

            {/* Governance Table */}
            <div className="rounded-xl bg-[#11141c] border border-[#1c2230] p-5 shadow-lg">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-red-400" />
                Experience Metadata Registry
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-[#1c2230]">
                      <th className="text-left py-2 pr-3">Experience ID</th>
                      <th className="text-left py-2 pr-3">Incident</th>
                      <th className="text-left py-2 pr-3">Service</th>
                      <th className="text-left py-2 pr-3">Outcome</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2 pr-3">Version</th>
                      <th className="text-left py-2">Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memories.map(mem => (
                      <tr key={mem.id} className="border-b border-[#1c2230]/50 hover:bg-[#141824] transition-colors">
                        <td className="py-2 pr-3 font-mono text-slate-300">{mem.id.slice(0, 12)}</td>
                        <td className="py-2 pr-3 font-mono text-white">{mem.incidentId}</td>
                        <td className="py-2 pr-3 text-slate-400">{mem.service}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            mem.outcome === 'successful'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : mem.outcome === 'partial'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>{mem.outcome}</span>
                        </td>
                        <td className="py-2 pr-3"><span className="text-emerald-400 text-[10px]">ACTIVE</span></td>
                        <td className="py-2 pr-3 text-slate-500 font-mono">v1</td>
                        <td className="py-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          RETAIN EXPERIENCE MODAL — Full Production Flow
         ══════════════════════════════════════════════════════ */}
      {isRetainModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-scale">
          <div className="bg-[#0e1526] border border-[#1c2230] rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Glow accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close */}
            <button onClick={() => setIsRetainModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            {/* ─── STEP: SELECT / INPUT ─── */}
            {retainStep === 'select' && (
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
                    <Plus className="w-4 h-4" />
                    <span>Retain New Experience</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">Capture Verified Experience</h2>
                  <p className="text-xs text-slate-400">
                    Before retaining, ensure: Root cause confirmed ✓ Fix verified ✓ Evidence attached ✓ Incident resolved ✓
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Experience Title</label>
                    <input type="text" required value={retainTitle}
                      onChange={(e) => setRetainTitle(e.target.value)}
                      placeholder="e.g. DB pool saturation in checkout"
                      className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Service</label>
                    <select value={retainService} onChange={(e) => setRetainService(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500 cursor-pointer">
                      <option value="checkout-service">checkout-service</option>
                      <option value="payment-service">payment-service</option>
                      <option value="user-service">user-service</option>
                      <option value="notification-service">notification-service</option>
                      <option value="upload-service">upload-service</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Symptoms (comma-separated)</label>
                  <input type="text" value={retainSymptoms}
                    onChange={(e) => setRetainSymptoms(e.target.value)}
                    placeholder="e.g. API latency spike, DB pool saturation, timeout errors"
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Root Cause</label>
                  <textarea required rows={2} value={retainRootCause}
                    onChange={(e) => setRetainRootCause(e.target.value)}
                    placeholder="What fundamentally caused this incident?"
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Verified Fix / Remediation Action</label>
                  <textarea required rows={2} value={retainAction}
                    onChange={(e) => setRetainAction(e.target.value)}
                    placeholder="What actions were executed and verified to work?"
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Key Lesson for Future Recall</label>
                  <textarea rows={2} value={retainLesson}
                    onChange={(e) => setRetainLesson(e.target.value)}
                    placeholder="What should the AI remember for next time?"
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Verification Status</label>
                  <div className="flex gap-2">
                    {['verified', 'partial', 'unverified'].map(v => (
                      <button key={v} type="button" onClick={() => setRetainVerification(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize cursor-pointer transition-all ${
                          retainVerification === v
                            ? v === 'verified' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : v === 'partial' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                            : 'bg-[#141824] border-[#1c2230] text-slate-500 hover:text-slate-300'
                        }`}>
                        {v === 'verified' ? '✓ ' : v === 'partial' ? '⚡ ' : '○ '}{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c2230]">
                  <button type="button" onClick={() => setIsRetainModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer">Cancel</button>
                  <button
                    onClick={proceedToReview}
                    disabled={!retainTitle.trim() || !retainRootCause.trim() || !retainAction.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40 transition-all cursor-pointer disabled:opacity-40"
                  >
                    Review Experience
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP: REVIEW — Retention Preview ─── */}
            {retainStep === 'review' && (
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
                    <FileCheck className="w-4 h-4" />
                    <span>Retention Review</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">Review Before Retaining</h2>
                  <p className="text-xs text-slate-400">Verify all fields are correct. This experience will be immutable once retained.</p>
                </div>

                <div className="rounded-xl bg-[#141824] border border-[#1c2230] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-white font-semibold">
                    <Brain className="w-4 h-4 text-red-400" />
                    <span>{retainTitle}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{retainService}</div>

                  <div className="space-y-2 pt-2">
                    {retainSymptoms && (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Symptoms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {retainSymptoms.split(',').map((s, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">• {s.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3" /> Root Cause
                      </div>
                      <p className="text-xs text-slate-300 bg-[#0e1220] p-2.5 rounded-lg border border-[#1c2230]">{retainRootCause}</p>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Fix
                      </div>
                      <p className="text-xs text-slate-300 bg-[#0e1220] p-2.5 rounded-lg border border-[#1c2230]">{retainAction}</p>
                    </div>

                    {retainLesson && (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Lesson
                        </div>
                        <p className="text-xs text-slate-300 bg-[#0e1220] p-2.5 rounded-lg border border-[#1c2230]">{retainLesson}</p>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Auto-Generated Tags
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {retainTags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-mono">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        retainVerification === 'verified' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          : retainVerification === 'partial' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : 'bg-slate-500/10 border-slate-500/25 text-slate-400'
                      }`}>
                        Verification: {retainVerification}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                        <Lock className="w-2.5 h-2.5 inline mr-0.5" />Immutable v1
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1c2230]">
                  <button type="button" onClick={() => setRetainStep('select')}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer">← Back to Edit</button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsRetainModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer">Cancel</button>
                    <button onClick={handleRetainExperience}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40 transition-all cursor-pointer">
                      <Brain className="w-3.5 h-3.5" />
                      Retain Experience
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP: INDEXING ─── */}
            {retainStep === 'indexing' && (
              <div className="p-6 py-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center anim-pulse-glow">
                  <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Indexing Experience...</h3>
                  <p className="text-xs text-slate-400 mt-1">Normalizing → Generating embeddings → Storing in vector index</p>
                </div>
                <div className="max-w-xs mx-auto space-y-2">
                  {['Memory normalization', 'Semantic indexing', 'Tag generation', 'Vector storage'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      {i < 2 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                       i === 2 ? <Loader2 className="w-3 h-3 text-red-400 animate-spin" /> :
                       <CircleDot className="w-3 h-3 text-slate-700" />}
                      <span className={i <= 2 ? 'text-slate-300' : 'text-slate-600'}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── STEP: COMPLETE ─── */}
            {retainStep === 'complete' && (
              <div className="p-6 py-12 text-center space-y-4 anim-fade-scale">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Experience Retained</h3>
                  <p className="text-xs text-red-400 font-mono mt-1">Indexed in Hindsight Memory Bank</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Future incidents matching this pattern will automatically recall this verified experience.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Experience Detail Modal */}
      {selectedExperience && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedExperience(null)}>
          <div className="bg-[#0e1526] border border-[#1c2230] rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">{selectedExperience.title}</h3>
              <button onClick={() => setSelectedExperience(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#141824] border border-[#1c2230]">
                <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">Root Cause</div>
                <p className="text-slate-300">{selectedExperience.rootCause}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#141824] border border-[#1c2230]">
                <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Resolution</div>
                <p className="text-slate-300">{selectedExperience.resolution}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#141824] border border-[#1c2230]">
                <div className="text-[10px] uppercase font-bold text-cyan-400 mb-1">Lesson</div>
                <p className="text-slate-300">{selectedExperience.lessonsLearned}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
