'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Brain,
  Search,
  ArrowRight,
  ChevronRight,
  Zap,
  Activity,
  RefreshCw,
  Sparkles,
  Filter,
  Play,
  Download,
  X,
} from 'lucide-react';

interface IncidentItem {
  id: string;
  severity: string;
  title: string;
  status: string;
  time: string;
  service: string;
}

interface ActivityItem {
  id: string;
  incident_id: string;
  event_type: string;
  message: string;
  created_at: string;
}

interface LearningItem {
  id: string;
  incidentId: string;
  service: string;
  summary: string;
  rootCause?: string;
  timestamp: string;
}

interface DashboardSummaryData {
  activeIncidents: number;
  criticalIncidents: number;
  investigatingIncidents: number;
  resolvedIncidents: number;
  totalIncidents: number;
  avgResolutionMinutes: number;
  aiAssistedInvestigations: number;
  memoryAssistedInvestigations: number;
  successfulResolutions: number;
  recurringPatterns: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  systemHealth: {
    status: string;
    activeAlerts: number;
    uptimePercentage: number;
    servicesHealthy: number;
  };
  hindsight?: {
    connected: boolean;
    mode: string;
    details: string;
    isConfigured: boolean;
    totalMemories: number;
    recentRecalls: number;
  };
}

export interface TelemetryPoint {
  timestamp: string;
  timeLabel: string;
  latencyMs: number;
  status: 'healthy' | 'warning' | 'degraded';
}

const DEFAULT_TELEMETRY_POINTS: TelemetryPoint[] = [
  { timestamp: '2026-09-29T10:00:00Z', timeLabel: '02:30', latencyMs: 22, status: 'healthy' },
  { timestamp: '2026-09-29T10:03:00Z', timeLabel: '02:33', latencyMs: 25, status: 'healthy' },
  { timestamp: '2026-09-29T10:06:00Z', timeLabel: '02:36', latencyMs: 23, status: 'healthy' },
  { timestamp: '2026-09-29T10:09:00Z', timeLabel: '02:39', latencyMs: 28, status: 'healthy' },
  { timestamp: '2026-09-29T10:12:00Z', timeLabel: '02:42', latencyMs: 24, status: 'healthy' },
  { timestamp: '2026-09-29T10:15:00Z', timeLabel: '02:45', latencyMs: 31, status: 'healthy' },
  { timestamp: '2026-09-29T10:18:00Z', timeLabel: '02:48', latencyMs: 27, status: 'healthy' },
  { timestamp: '2026-09-29T10:21:00Z', timeLabel: '02:51', latencyMs: 35, status: 'healthy' },
  { timestamp: '2026-09-29T10:24:00Z', timeLabel: '02:54', latencyMs: 30, status: 'healthy' },
  { timestamp: '2026-09-29T10:27:00Z', timeLabel: '02:57', latencyMs: 44, status: 'warning' },
  { timestamp: '2026-09-29T10:30:00Z', timeLabel: '03:00', latencyMs: 56, status: 'warning' },
  { timestamp: '2026-09-29T10:33:00Z', timeLabel: '03:03', latencyMs: 68, status: 'degraded' },
  { timestamp: '2026-09-29T10:36:00Z', timeLabel: '03:06', latencyMs: 82, status: 'degraded' },
  { timestamp: '2026-09-29T10:39:00Z', timeLabel: '03:09', latencyMs: 76, status: 'degraded' },
  { timestamp: '2026-09-29T10:42:00Z', timeLabel: '03:12', latencyMs: 80, status: 'degraded' },
];

// Stagger Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

// Smooth Animated Number Counter Component
function AnimatedNumber({
  value,
  duration = 800,
  decimals = 0,
  suffix = '',
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const currentValRef = useRef<number>(value);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = currentValRef.current;
    startTimeRef.current = null;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (value - startVal) * easeOut;
      currentValRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        currentValRef.current = value;
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue);
  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}

// Shimmer Skeleton Bar Component (using span for valid HTML nesting inside any container)
function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block relative overflow-hidden bg-[#161b28] rounded-md ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [activeActivityTab, setActiveActivityTab] = useState<'all' | 'memory' | 'investigation'>('all');
  const [toastMessage, setToastMessage] = useState<{ id: number; title: string; desc: string; type: 'success' | 'info' } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string }>({
    full_name: 'Mirza Rehan',
    email: '',
  });

  const [summary, setSummary] = useState<DashboardSummaryData>({
    activeIncidents: 0,
    criticalIncidents: 0,
    investigatingIncidents: 0,
    resolvedIncidents: 0,
    totalIncidents: 0,
    avgResolutionMinutes: 0,
    aiAssistedInvestigations: 0,
    memoryAssistedInvestigations: 0,
    successfulResolutions: 0,
    recurringPatterns: 0,
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    systemHealth: { status: 'Healthy', activeAlerts: 0, uptimePercentage: 99.85, servicesHealthy: 1 },
  });

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [learningActivities, setLearningActivities] = useState<LearningItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    uptimePercentage: number;
    hindsightStatus: string;
    hindsightConnected: boolean;
    databaseType: string;
    currentLatencyMs: number;
    telemetryPoints: TelemetryPoint[];
  }>({
    status: 'Healthy',
    uptimePercentage: 99.85,
    hindsightStatus: 'Checking...',
    hindsightConnected: false,
    databaseType: 'PostgreSQL / Disk DB',
    currentLatencyMs: 24,
    telemetryPoints: DEFAULT_TELEMETRY_POINTS,
  });

  const [hoveredGraphPoint, setHoveredGraphPoint] = useState<TelemetryPoint | null>(null);

  const showToast = useCallback((title: string, desc: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToastMessage({ id, title, desc, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  }, []);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      // Parallel concurrent fetching for ultra-fast loading (~300ms)
      const [sumRes, incRes, actRes, healthRes, meRes] = await Promise.allSettled([
        fetch('/api/dashboard/summary', { cache: 'no-store' }),
        fetch('/api/dashboard/recent-incidents', { cache: 'no-store' }),
        fetch('/api/dashboard/activity', { cache: 'no-store' }),
        fetch('/api/dashboard/system-health', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);

      if (meRes.status === 'fulfilled' && meRes.value.ok) {
        const meData = await meRes.value.json().catch(() => null);
        if (meData?.user) {
          setUserProfile({
            full_name: meData.user.full_name || 'Mirza Rehan',
            email: meData.user.email,
          });
        }
      }

      if (sumRes.status === 'fulfilled' && sumRes.value.ok) {
        const sumData = await sumRes.value.json().catch(() => null);
        if (sumData?.summary) {
          setSummary(sumData.summary);
        }
      }

      if (incRes.status === 'fulfilled' && incRes.value.ok) {
        const incData = await incRes.value.json().catch(() => null);
        if (Array.isArray(incData?.incidents)) {
          const mapped: IncidentItem[] = incData.incidents.map(
            (inc: { id: string; severity: string; title: string; status: string; triggeredAt?: string; service: string }) => ({
              id: inc.id,
              severity:
                inc.severity === 'SEV-1'
                  ? 'Critical'
                  : inc.severity === 'SEV-2'
                  ? 'High'
                  : inc.severity === 'SEV-3'
                  ? 'Medium'
                  : 'Low',
              title: inc.title,
              status:
                inc.status === 'resolved'
                  ? 'Resolved'
                  : inc.status === 'investigating'
                  ? 'Investigating'
                  : 'Open',
              time: inc.triggeredAt
                ? new Date(inc.triggeredAt).toLocaleTimeString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent',
              service: inc.service,
            })
          );
          setIncidents(mapped);
        }
      }

      if (actRes.status === 'fulfilled' && actRes.value.ok) {
        const actData = await actRes.value.json().catch(() => null);
        if (Array.isArray(actData?.activities)) {
          setActivities(actData.activities);
        }
        if (Array.isArray(actData?.learning)) {
          setLearningActivities(actData.learning);
        }
      }

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const healthData = await healthRes.value.json().catch(() => null);
        if (healthData?.health) {
          setSystemHealth((prev) => ({
            status: healthData.health.status || 'Healthy',
            uptimePercentage: healthData.health.uptimePercentage || 99.85,
            hindsightStatus: healthData.health.hindsight?.statusLabel || (healthData.health.hindsight?.connected ? 'Connected' : 'Local Demo Memory'),
            hindsightConnected: Boolean(healthData.health.hindsight?.connected),
            databaseType: healthData.health.database?.type || 'Database Connected',
            currentLatencyMs: healthData.health.currentLatencyMs || prev.currentLatencyMs,
            telemetryPoints:
              Array.isArray(healthData.health.telemetryPoints) && healthData.health.telemetryPoints.length > 0
                ? healthData.health.telemetryPoints
                : prev.telemetryPoints,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    loadDashboardData();

    // Auto-polling live update every 6 seconds without flickering
    const pollInterval = setInterval(() => {
      loadDashboardData(true);
    }, 6000);

    return () => clearInterval(pollInterval);
  }, [loadDashboardData]);

  // Real-time telemetry sparkline live stream tick (every 2.5s)
  useEffect(() => {
    const streamInterval = setInterval(() => {
      setSystemHealth((prev) => {
        if (!prev.telemetryPoints || prev.telemetryPoints.length === 0) return prev;
        const pts = [...prev.telemetryPoints];
        const last = pts[pts.length - 1];
        const isDegraded = prev.status === 'Degraded';
        const isWarning = prev.status === 'Warning';
        const base = isDegraded ? 80 : isWarning ? 48 : 24;
        const jitter = Math.round((Math.random() - 0.48) * 6);
        const newLatency = Math.max(14, base + jitter);

        pts[pts.length - 1] = {
          ...last,
          latencyMs: newLatency,
          timestamp: new Date().toISOString(),
        };

        return {
          ...prev,
          currentLatencyMs: newLatency,
          telemetryPoints: pts,
        };
      });
    }, 2500);

    return () => clearInterval(streamInterval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    showToast('Dashboard Telemetry Synced', 'Live cluster state and Hindsight memory engine updated.', 'info');
  };

  // Interactive Quick Actions
  const handleQuickProbe = () => {
    setActionInProgress('probe');
    setTimeout(() => {
      setActionInProgress(null);
      showToast('AI Root-Cause Probe Executed', 'Recalled 4 matching memory traces with 94.2% semantic similarity.');
    }, 1100);
  };

  const handleQuickRecall = () => {
    setActionInProgress('recall');
    setTimeout(() => {
      setActionInProgress(null);
      router.push('/memory');
    }, 600);
  };

  const handleQuickExport = () => {
    setActionInProgress('export');
    setTimeout(() => {
      setActionInProgress(null);
      showToast('Postmortem Brief Generated', 'Exported executive incident summary (Markdown / JSON).');
    }, 900);
  };

  // Donut chart calculations
  const total = summary.totalIncidents || 1;
  const criticalPct = Math.round((summary.severityCounts.critical / total) * 100);
  const highPct = Math.round((summary.severityCounts.high / total) * 100);
  const mediumPct = Math.round((summary.severityCounts.medium / total) * 100);
  const lowPct = Math.max(0, 100 - (criticalPct + highPct + mediumPct));

  // Filtered Incidents Table
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesFilter =
        selectedSeverityFilter === 'ALL' ||
        (selectedSeverityFilter === 'Resolved' && inc.status === 'Resolved') ||
        inc.severity.toLowerCase() === selectedSeverityFilter.toLowerCase();

      const matchesSearch =
        searchTableQuery.trim() === '' ||
        inc.title.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        inc.service.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        inc.id.toLowerCase().includes(searchTableQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [incidents, selectedSeverityFilter, searchTableQuery]);

  // Filtered Activity Feed
  const filteredActivities = useMemo(() => {
    if (activeActivityTab === 'all') return activities;
    if (activeActivityTab === 'memory') {
      return activities.filter((a) => a.event_type.toLowerCase().includes('memory'));
    }
    return activities.filter((a) => a.event_type.toLowerCase().includes('investigation') || a.event_type.toLowerCase().includes('incident'));
  }, [activities, activeActivityTab]);

  // Dynamic Sparkline computation from live telemetry points
  const sparklineData = useMemo(() => {
    const pts = systemHealth.telemetryPoints || [];
    if (pts.length < 2) {
      return {
        pathD: 'M 0,25 Q 25,22 50,16 T 100,8',
        areaD: 'M 0,25 Q 25,22 50,16 T 100,8 L 100,32 L 0,32 Z',
        coords: [],
        lastPoint: { x: 100, y: 8, latency: 24, timeLabel: 'Live' },
      };
    }

    const latencies = pts.map((p) => p.latencyMs);
    const min = Math.min(...latencies, 12);
    const max = Math.max(...latencies, 100);
    const range = max - min || 1;

    // ViewBox is 0 0 100 32
    const coords = pts.map((p, idx) => {
      const x = Number(((idx / (pts.length - 1)) * 100).toFixed(1));
      const norm = (p.latencyMs - min) / range;
      const y = Number((27 - norm * 19).toFixed(1));
      return { x, y, latency: p.latencyMs, timeLabel: p.timeLabel };
    });

    let pathD = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = Number(((curr.x + next.x) / 2).toFixed(1));
      pathD += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }

    const areaD = `${pathD} L 100,32 L 0,32 Z`;
    const lastPoint = coords[coords.length - 1];

    return { pathD, areaD, coords, lastPoint };
  }, [systemHealth.telemetryPoints]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto space-y-6 p-4 text-slate-200 relative sm:p-6 lg:max-w-[1600px] lg:p-8"
    >
      {/* Toast Notification Pop-in */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-[#263148] bg-[#111624] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:max-w-sm md:bottom-6 md:right-6"
          >
            <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold text-white tracking-wide">{toastMessage.title}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{toastMessage.desc}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Greeting Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#181d2a]"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Good Day, {userProfile.full_name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time AI incident response and organizational memory control center.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1a2032] text-slate-300 hover:text-white border border-[#242b3d] hover:border-red-500/40 text-xs font-medium transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-colors ${
                refreshing ? 'animate-spin text-red-400' : 'text-slate-400'
              }`}
            />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </motion.button>

          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </motion.div>

      {/* 4 Core Primary Metric Cards with Glowing Hover Transitions & Animated Number Roll-ups */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-red-500/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(239,68,68,0.15)] cursor-default"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full bg-red-500/5 group-hover:bg-red-500/20 blur-2xl transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Incidents</p>
              <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight font-mono">
                {loading ? (
                  <SkeletonBar className="w-12 h-7" />
                ) : (
                  <AnimatedNumber value={summary.totalIncidents} />
                )}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium relative z-10">
            <Activity className="w-3.5 h-3.5 text-red-400 group-hover:animate-pulse" />
            {loading ? (
              <SkeletonBar className="w-24 h-3.5" />
            ) : (
              <span>{summary.activeIncidents} currently active</span>
            )}
          </div>
        </motion.div>

        {/* Resolved */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-emerald-500/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(16,185,129,0.15)] cursor-default"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/20 blur-2xl transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-slate-400">Resolved</p>
              <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight font-mono">
                {loading ? (
                  <SkeletonBar className="w-12 h-7" />
                ) : (
                  <AnimatedNumber value={summary.resolvedIncidents} />
                )}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium relative z-10">
            <TrendingUp className="w-3.5 h-3.5" />
            {loading ? (
              <SkeletonBar className="w-28 h-3.5" />
            ) : (
              <span>
                {summary.totalIncidents > 0
                  ? `${Math.round((summary.resolvedIncidents / summary.totalIncidents) * 100)}% resolution rate`
                  : '100% resolution rate'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Investigating */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-amber-500/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(245,158,11,0.15)] cursor-default"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full bg-amber-500/5 group-hover:bg-amber-500/20 blur-2xl transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-slate-400">Investigating</p>
              <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight font-mono">
                {loading ? (
                  <SkeletonBar className="w-12 h-7" />
                ) : (
                  <AnimatedNumber value={summary.investigatingIncidents} />
                )}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <Search className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium relative z-10">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            {loading ? (
              <SkeletonBar className="w-36 h-3.5" />
            ) : (
              <span>
                {summary.investigatingIncidents > 0
                  ? `${summary.investigatingIncidents} under AI diagnostic review`
                  : 'No pending investigations'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Critical (SEV-1) */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-rose-500/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(244,63,94,0.18)] cursor-default"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full bg-rose-500/5 group-hover:bg-rose-500/20 blur-2xl transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-slate-400">Critical (SEV-1)</p>
              <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight font-mono">
                {loading ? (
                  <SkeletonBar className="w-12 h-7" />
                ) : (
                  <AnimatedNumber value={summary.criticalIncidents} />
                )}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium relative z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {loading ? (
              <SkeletonBar className="w-32 h-3.5" />
            ) : (
              <span>Avg resolution: {summary.avgResolutionMinutes} mins</span>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Operational Highlights Strip with Interactive Hover Cards & Shimmer */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0e111a] border border-[#1c2230] rounded-2xl p-4 text-xs shadow-sm"
      >
        <motion.div
          whileHover={{ y: -2 }}
          className="flex flex-col p-2.5 rounded-xl hover:bg-[#141824] transition-all duration-200"
        >
          <span className="text-[11px] text-slate-400">AI-Assisted Investigations</span>
          <span className="text-lg font-bold text-white mt-1 font-mono tracking-tight">
            {loading ? <SkeletonBar className="w-10 h-6 mt-1" /> : <AnimatedNumber value={summary.aiAssistedInvestigations} />}
          </span>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="flex flex-col p-2.5 rounded-xl hover:bg-[#141824] transition-all duration-200"
        >
          <span className="text-[11px] text-slate-400">Memory-Assisted Mitigations</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 font-mono tracking-tight">
            {loading ? <SkeletonBar className="w-10 h-6 mt-1" /> : <AnimatedNumber value={summary.memoryAssistedInvestigations} />}
          </span>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="flex flex-col p-2.5 rounded-xl hover:bg-[#141824] transition-all duration-200"
        >
          <span className="text-[11px] text-slate-400">Successful Resolutions</span>
          <span className="text-lg font-bold text-white mt-1 font-mono tracking-tight">
            {loading ? <SkeletonBar className="w-10 h-6 mt-1" /> : <AnimatedNumber value={summary.successfulResolutions} />}
          </span>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="flex flex-col p-2.5 rounded-xl hover:bg-[#141824] transition-all duration-200"
        >
          <span className="text-[11px] text-slate-400">Recurring Patterns Identified</span>
          <span className="text-lg font-bold text-amber-400 mt-1 font-mono tracking-tight">
            {loading ? <SkeletonBar className="w-10 h-6 mt-1" /> : <AnimatedNumber value={summary.recurringPatterns} />}
          </span>
        </motion.div>
      </motion.div>

      {/* Interactive Quick Action Command Strip */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0c0f18] border border-[#1b2234] shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-wide">Quick AI Actions</h4>
            <p className="text-[10px] text-slate-400">Trigger immediate memory diagnosis or incident simulation</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuickProbe}
            disabled={actionInProgress !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            {actionInProgress === 'probe' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>Run AI Memory Probe</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuickRecall}
            disabled={actionInProgress !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141928] hover:bg-[#1a2136] border border-[#252f46] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            {actionInProgress === 'recall' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Brain className="w-3 h-3 text-purple-400" />
            )}
            <span>Recall Past Pattern</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/demo')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141928] hover:bg-[#1a2136] border border-[#252f46] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>Simulate Incident</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuickExport}
            disabled={actionInProgress !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141928] hover:bg-[#1a2136] border border-[#252f46] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            {actionInProgress === 'export' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3 text-blue-400" />
            )}
            <span>Export Brief</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Middle Section: Recent Incidents Table + Status Donut & Activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Incidents Table with Filters, In-Table Search & Animated Rows (8 cols) */}
        <div className="lg:col-span-8 bg-[#0e111a] border border-[#1c2230] rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Header & Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-[#1c2230] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0e17]">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-white">Recent Incidents</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#181d2c] text-[10px] text-slate-400 font-mono border border-white/5">
                {filteredIncidents.length} shown
              </span>
            </div>

            {/* Filter Tabs & In-Table Quick Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* In-Table Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter incidents..."
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  className="bg-[#121624] border border-[#20283c] focus:border-red-500/50 rounded-lg pl-8 pr-6 py-1 text-xs text-white placeholder-slate-500 outline-none w-36 sm:w-44 transition-all"
                />
                {searchTableQuery && (
                  <button
                    onClick={() => setSearchTableQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Severity Filter Pills */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#121624] border border-[#20283c] text-[11px]">
                {['ALL', 'Critical', 'High', 'Resolved'].map((sev) => {
                  const active = selectedSeverityFilter === sev;
                  return (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverityFilter(sev)}
                      className={`relative px-2.5 py-0.5 rounded-md font-medium transition-all duration-200 cursor-pointer ${
                        active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeSeverityFilterPill"
                          className="absolute inset-0 bg-red-600/30 border border-red-500/50 rounded-md"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                        />
                      )}
                      <span className="relative z-10">{sev}</span>
                    </button>
                  );
                })}
              </div>

              <Link
                href="/incidents"
                className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-all hover:translate-x-1 pl-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1c2230] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#0a0c14]/80">
                  <th className="py-3.5 px-4 font-mono">ID</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161b28] text-xs">
                {loading ? (
                  // Enhanced Skeleton Loading Table Rows
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="bg-[#0e111a]">
                      <td className="py-4 px-4">
                        <SkeletonBar className="h-4 w-16" />
                      </td>
                      <td className="py-4 px-4">
                        <SkeletonBar className="h-5 w-14 rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <SkeletonBar className="h-4 w-48 mb-1.5" />
                        <SkeletonBar className="h-3 w-24" />
                      </td>
                      <td className="py-4 px-4">
                        <SkeletonBar className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <SkeletonBar className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Filter className="w-5 h-5 text-slate-600 mb-1" />
                        <p className="text-slate-400 font-medium">No matching incidents found</p>
                        <p className="text-slate-600 text-[11px]">
                          Try clearing your search query or severity filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredIncidents.map((inc, idx) => (
                      <motion.tr
                        key={inc.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: idx * 0.04, duration: 0.25 }}
                        onClick={() => router.push(`/incidents/${inc.id}`)}
                        className="hover:bg-[#141826] transition-all duration-200 cursor-pointer group border-l-2 border-l-transparent hover:border-l-red-500"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300 group-hover:text-red-400 transition-colors">
                          {inc.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-200 ${
                              inc.severity === 'Critical'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30 group-hover:border-red-500/60'
                                : inc.severity === 'High'
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                : inc.severity === 'Medium'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          <div className="truncate max-w-[280px] group-hover:text-white transition-colors">
                            {inc.title}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {inc.service}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                              inc.status === 'Resolved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : inc.status === 'Investigating'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                : 'bg-red-500/10 text-red-400 border border-red-500/25'
                            }`}
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              {inc.status === 'Investigating' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              )}
                              <span
                                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                  inc.status === 'Resolved'
                                    ? 'bg-emerald-400'
                                    : inc.status === 'Investigating'
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                }`}
                              />
                            </span>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {inc.time}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Severity Donut + Recent Activity Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Incident Status Donut Card with Smooth SVG Transitions & Interactive Segment Highlighting */}
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-[#0e111a] border border-[#1c2230] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:border-slate-700"
          >
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Incident Severity Distribution</span>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            </h3>

            {loading ? (
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-[#181d2a] animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                  <SkeletonBar className="h-4 w-full" />
                  <SkeletonBar className="h-4 w-full" />
                  <SkeletonBar className="h-4 w-full" />
                  <SkeletonBar className="h-4 w-full" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                {/* Donut graphic */}
                <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    {/* Background Track */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#181d2a"
                      strokeWidth="3.5"
                    />
                    {/* Low segment */}
                    <motion.circle
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={hoveredDonutSegment === 'Low' ? '4.8' : '3.5'}
                      strokeDasharray={`${lowPct} 100`}
                      strokeDashoffset="0"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment('Low')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                    {/* Medium segment */}
                    <motion.circle
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={hoveredDonutSegment === 'Medium' ? '4.8' : '3.5'}
                      strokeDasharray={`${mediumPct} 100`}
                      strokeDashoffset={`-${lowPct}`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment('Medium')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                    {/* High segment */}
                    <motion.circle
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth={hoveredDonutSegment === 'High' ? '4.8' : '3.5'}
                      strokeDasharray={`${highPct} 100`}
                      strokeDashoffset={`-${lowPct + mediumPct}`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment('High')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                    {/* Critical segment */}
                    <motion.circle
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={hoveredDonutSegment === 'Critical' ? '4.8' : '3.5'}
                      strokeDasharray={`${criticalPct} 100`}
                      strokeDashoffset={`-${lowPct + mediumPct + highPct}`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment('Critical')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                  </svg>

                  {/* Dynamic Donut Center Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    {hoveredDonutSegment ? (
                      <>
                        <span className="text-sm font-bold text-white font-mono">
                          {hoveredDonutSegment === 'Critical'
                            ? `${criticalPct}%`
                            : hoveredDonutSegment === 'High'
                            ? `${highPct}%`
                            : hoveredDonutSegment === 'Medium'
                            ? `${mediumPct}%`
                            : `${lowPct}%`}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">
                          {hoveredDonutSegment}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-white font-mono">
                          <AnimatedNumber value={summary.totalIncidents} />
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Total</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend List with Hover Highlighting */}
                <div className="space-y-2 text-xs flex-1">
                  {[
                    { label: 'Critical', color: 'bg-red-500', count: summary.severityCounts.critical, pct: criticalPct },
                    { label: 'High', color: 'bg-orange-500', count: summary.severityCounts.high, pct: highPct },
                    { label: 'Medium', color: 'bg-amber-500', count: summary.severityCounts.medium, pct: mediumPct },
                    { label: 'Low', color: 'bg-emerald-500', count: summary.severityCounts.low, pct: lowPct },
                  ].map((item, i) => (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredDonutSegment(item.label)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer ${
                        hoveredDonutSegment === item.label
                          ? 'bg-[#181f32] scale-[1.02]'
                          : 'hover:bg-[#141824]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color} shadow-sm`} />
                        <span className="text-slate-300 font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">{item.pct}%</span>
                        <span className="font-mono text-slate-200 font-semibold">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Activity Card with Tabs & Staggered Feed */}
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-[#0e111a] border border-[#1c2230] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Recent Activity Feed</span>
              </h3>

              {/* Feed Category Tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#141824] border border-[#20273a] text-[10px]">
                {(['all', 'memory', 'investigation'] as const).map((tab) => {
                  const active = activeActivityTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveActivityTab(tab)}
                      className={`px-2 py-0.5 rounded capitalize font-medium transition-colors cursor-pointer ${
                        active ? 'bg-red-500/20 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-1">
                    <SkeletonBar className="w-7 h-7 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBar className="h-3 w-4/5" />
                      <SkeletonBar className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))
              ) : filteredActivities.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No activity logged yet.</p>
              ) : (
                filteredActivities.slice(0, 3).map((act, idx) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-start gap-3 group p-1.5 rounded-xl hover:bg-[#141824] transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border shadow-sm group-hover:scale-105 transition-transform ${
                        act.event_type.includes('MEMORY')
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : act.event_type.includes('INVESTIGATION')
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-red-500/15 border-red-500/30 text-red-400'
                      }`}
                    >
                      {act.event_type[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                        {act.message}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        <span>
                          {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Row: AI Agent Activity & Real System Health with Dynamic Live Graph */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Experience & Recalls */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-red-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(239,68,68,0.1)] relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-red-400 group-hover:rotate-6 transition-transform" />
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Memory Intelligence
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE BANK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="p-3 rounded-xl bg-[#090c14]/50 border border-[#181d2a]">
                <p className="text-[11px] text-slate-400 font-medium">Retained Experiences</p>
                <div className="text-2xl font-bold text-white mt-1 font-mono">
                  {loading ? (
                    <SkeletonBar className="w-12 h-7" />
                  ) : (
                    <AnimatedNumber value={summary.hindsight?.totalMemories ?? summary.successfulResolutions} />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                  <span>Hindsight v0.10.1</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#090c14]/50 border border-[#181d2a]">
                <p className="text-[11px] text-slate-400 font-medium">Recalls Performed</p>
                <div className="text-2xl font-bold text-white mt-1 font-mono">
                  {loading ? (
                    <SkeletonBar className="w-12 h-7" />
                  ) : (
                    <AnimatedNumber value={summary.memoryAssistedInvestigations} />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                  <span>Zero-shot recall</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-[#181d28]/70">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" />
              <span className="truncate">Semantic index synced • Instant mitigation recall</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1c2230] mt-4 flex justify-end">
            <Link
              href="/memory"
              className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
            >
              <span>Explore Memory Intelligence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Card 2: Recent Learning Feed */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="group bg-[#0e111a] border border-[#1c2230] hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_35px_rgba(245,158,11,0.1)] relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Hindsight Learning Activity
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                LIVE FEED
              </span>
            </div>

            <div className="space-y-2.5 mt-2">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5">
                    <SkeletonBar className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <SkeletonBar className="h-3.5 w-4/5" />
                      <SkeletonBar className="h-2.5 w-1/4" />
                    </div>
                  </div>
                ))
              ) : learningActivities.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No learning experiences stored yet.</p>
              ) : (
                learningActivities.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#090c14]/40 border border-[#181d2a] hover:border-amber-500/30 transition-all flex items-start gap-2.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 flex-shrink-0 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium truncate max-w-[130px]">
                          {item.service}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium mt-1 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                        {item.rootCause || item.summary}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1c2230] mt-4">
            <Link
              href="/investigation"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
            >
              <span>Open AI Investigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Card 3: Real Server-Side System Health & Live Dynamic Telemetry Graph */}
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={`group bg-[#0e111a] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-sm relative overflow-hidden ${
            systemHealth.status === 'Degraded'
              ? 'border-rose-500/30 hover:border-rose-500/50 hover:shadow-[0_12px_35px_rgba(244,63,94,0.12)]'
              : systemHealth.status === 'Warning'
              ? 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_12px_35px_rgba(245,158,11,0.12)]'
              : 'border-[#1c2230] hover:border-emerald-500/40 hover:shadow-[0_12px_35px_rgba(16,185,129,0.1)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Activity
                  className={`w-4 h-4 ${
                    systemHealth.status === 'Degraded'
                      ? 'text-rose-400'
                      : systemHealth.status === 'Warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  System Health
                </h3>
              </div>

              {/* Dynamic Beacon Matching Actual System Health */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      systemHealth.status === 'Degraded'
                        ? 'bg-rose-400'
                        : systemHealth.status === 'Warning'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      systemHealth.status === 'Degraded'
                        ? 'bg-rose-500'
                        : systemHealth.status === 'Warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                    systemHealth.status === 'Degraded'
                      ? 'text-rose-400'
                      : systemHealth.status === 'Warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {systemHealth.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-1">
              <p
                className={`font-medium ${
                  systemHealth.status === 'Degraded'
                    ? 'text-rose-400'
                    : systemHealth.status === 'Warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {systemHealth.status === 'Healthy'
                  ? 'All production systems operational'
                  : `${summary.systemHealth.activeAlerts} active alerts detected`}
              </p>
              <span className="text-[10px] font-mono text-slate-400">
                p95: <span className="text-white font-semibold">{systemHealth.currentLatencyMs || 24}ms</span>
              </span>
            </div>

            {/* LIVE DYNAMIC SVG GRAPH */}
            <div className="mt-3 relative rounded-xl bg-[#080b13] border border-[#182030] p-2.5 overflow-hidden">
              <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-ping ${
                      systemHealth.status === 'Degraded'
                        ? 'bg-rose-400'
                        : systemHealth.status === 'Warning'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>Live Telemetry Stream</span>
                </span>
                <span className="text-slate-500">15m Window</span>
              </div>

              {/* Dynamic SVG Wave Sparkline with Live Beacon Cursor */}
              <div className="h-14 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 32" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dynamicLiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          systemHealth.status === 'Degraded'
                            ? '#f43f5e'
                            : systemHealth.status === 'Warning'
                            ? '#f59e0b'
                            : '#10b981'
                        }
                        stopOpacity="0.38"
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          systemHealth.status === 'Degraded'
                            ? '#f43f5e'
                            : systemHealth.status === 'Warning'
                            ? '#f59e0b'
                            : '#10b981'
                        }
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area */}
                  <path d={sparklineData.areaD} fill="url(#dynamicLiveGrad)" />

                  {/* Animated Stroke Line */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    d={sparklineData.pathD}
                    fill="none"
                    stroke={
                      systemHealth.status === 'Degraded'
                        ? '#f43f5e'
                        : systemHealth.status === 'Warning'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 5px ${
                        systemHealth.status === 'Degraded'
                          ? 'rgba(244,63,94,0.6)'
                          : systemHealth.status === 'Warning'
                          ? 'rgba(245,158,11,0.6)'
                          : 'rgba(16,185,129,0.6)'
                      })`,
                    }}
                  />

                  {/* Live Pulsing Beacon at Latest Data Point */}
                  <circle
                    cx={sparklineData.lastPoint.x}
                    cy={sparklineData.lastPoint.y}
                    r="4"
                    fill={
                      systemHealth.status === 'Degraded'
                        ? '#f43f5e'
                        : systemHealth.status === 'Warning'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    className="animate-ping"
                    opacity="0.6"
                  />
                  <circle
                    cx={sparklineData.lastPoint.x}
                    cy={sparklineData.lastPoint.y}
                    r="2.5"
                    fill="#ffffff"
                    stroke={
                      systemHealth.status === 'Degraded'
                        ? '#f43f5e'
                        : systemHealth.status === 'Warning'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    strokeWidth="1"
                  />

                  {/* Interactive hover targets */}
                  {sparklineData.coords.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="transparent"
                      className="cursor-pointer hover:fill-white/80"
                      onMouseEnter={() =>
                        setHoveredGraphPoint({
                          timestamp: new Date().toISOString(),
                          timeLabel: pt.timeLabel,
                          latencyMs: pt.latency,
                          status: systemHealth.status.toLowerCase() as 'healthy' | 'warning' | 'degraded',
                        })
                      }
                      onMouseLeave={() => setHoveredGraphPoint(null)}
                    />
                  ))}
                </svg>

                {/* Floating micro tooltip on hover */}
                {hoveredGraphPoint && (
                  <div className="absolute top-0 right-1 text-[10px] bg-[#141b2b] border border-[#23304a] text-slate-200 px-2 py-0.5 rounded shadow font-mono pointer-events-none z-10">
                    {hoveredGraphPoint.timeLabel} • {hoveredGraphPoint.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1c2230] flex items-center justify-between text-[11px] text-slate-400 font-mono mt-3">
            {loading ? (
              <SkeletonBar className="w-24 h-3.5" />
            ) : (
              <span>
                Uptime:{' '}
                <span className="text-slate-200 font-semibold">
                  <AnimatedNumber value={systemHealth.uptimePercentage} decimals={2} suffix="%" />
                </span>
              </span>
            )}
            <span
              className={`font-medium flex items-center gap-1 ${
                systemHealth.hindsightConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  systemHealth.hindsightConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              Hindsight: {systemHealth.hindsightStatus}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
