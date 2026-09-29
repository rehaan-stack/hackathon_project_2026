'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Incident, InvestigationResult, RecalledMemory } from '@/lib/types';
import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { StatusBadge } from '@/components/incidents/StatusBadge';
import { MemoryCard } from '@/components/memory/MemoryCard';
import { ResolutionModal } from '@/components/investigation/ResolutionModal';
import {
  Brain,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity,
  Search,
  Shield,
  ShieldCheck,
  Zap,
  FileCheck,
  Eye,
  ChevronRight,
  ArrowRight,
  Loader2,
  TrendingUp,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Play,
  BarChart3,
  Database,
  Cpu,
  Network,
  CircleDot,
  Gauge,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// STATE MACHINE — Investigation Lifecycle
// ─────────────────────────────────────────────────────────
type LifecyclePhase =
  | 'NEW'
  | 'INVESTIGATING'
  | 'EVIDENCE_COLLECTED'
  | 'MITIGATION_READY'
  | 'MITIGATING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'RESOLVING'
  | 'RESOLVED'
  | 'RETAINED';

interface EvidenceItem {
  id: string;
  type: 'log' | 'metric' | 'deploy' | 'correlation' | 'memory';
  signal: string;
  weight: number; // 0-1 contribution to confidence
  category: 'supporting' | 'missing' | 'neutral';
  source: string;
  timestamp: string;
}

interface MitigationAction {
  id: string;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  reversible: boolean;
  status: 'pending' | 'executing' | 'done' | 'failed' | 'skipped';
  requiresApproval: boolean;
  result?: string;
  executedAt?: string;
}

interface VerificationCheck {
  id: string;
  label: string;
  metric: string;
  threshold: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  currentValue?: string;
  checkedAt?: string;
}

const PHASE_ORDER: LifecyclePhase[] = [
  'NEW', 'INVESTIGATING', 'EVIDENCE_COLLECTED', 'MITIGATION_READY',
  'MITIGATING', 'VERIFYING', 'VERIFIED', 'RESOLVING', 'RESOLVED', 'RETAINED',
];

const PHASE_META: Record<LifecyclePhase, { label: string; icon: React.ElementType; color: string }> = {
  NEW:                { label: 'New',                icon: AlertTriangle, color: 'text-slate-400' },
  INVESTIGATING:      { label: 'Investigating',      icon: Search,        color: 'text-blue-400' },
  EVIDENCE_COLLECTED: { label: 'Evidence',           icon: FileCheck,     color: 'text-amber-400' },
  MITIGATION_READY:   { label: 'Mitigation Ready',   icon: Shield,        color: 'text-orange-400' },
  MITIGATING:         { label: 'Mitigating',          icon: Zap,           color: 'text-orange-400' },
  VERIFYING:          { label: 'Verifying',           icon: Eye,           color: 'text-cyan-400' },
  VERIFIED:           { label: 'Verified',            icon: ShieldCheck,   color: 'text-emerald-400' },
  RESOLVING:          { label: 'Resolving',           icon: CheckCircle2,  color: 'text-emerald-400' },
  RESOLVED:           { label: 'Resolved',            icon: CheckCircle2,  color: 'text-emerald-400' },
  RETAINED:           { label: 'Retained',            icon: Brain,         color: 'text-purple-400' },
};

// ─────────────────────────────────────────────────────────
// EVIDENCE ENGINE — Weight-based confidence scoring
// ─────────────────────────────────────────────────────────
function computeConfidence(evidence: EvidenceItem[]): { score: number; breakdown: string } {
  const supporting = evidence.filter(e => e.category === 'supporting');
  const missing    = evidence.filter(e => e.category === 'missing');
  if (evidence.length === 0) return { score: 0, breakdown: 'No evidence collected' };

  const totalWeight    = evidence.reduce((s, e) => s + e.weight, 0);
  const supportWeight  = supporting.reduce((s, e) => s + e.weight, 0);
  const missingPenalty = missing.reduce((s, e) => s + e.weight * 0.3, 0);
  const raw = totalWeight > 0 ? (supportWeight - missingPenalty) / totalWeight : 0;
  const score = Math.max(0, Math.min(1, raw));

  const breakdown = `${supporting.length} supporting signals (${(supportWeight * 100).toFixed(0)}% weight) — ${missing.length} missing (−${(missingPenalty * 100).toFixed(0)}% penalty)`;
  return { score, breakdown };
}

// ─────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────
interface Props {
  initialIncident?: Incident;
  allIncidents?: Incident[];
}

// Default telemetry for sparkline (defined outside component for purity)
const DEFAULT_SPARK_POINTS = [45, 52, 48, 95, 120, 180, 250, 310, 280, 190, 140, 95, 70, 55, 48];

export function InvestigationWorkspace({ initialIncident, allIncidents = [] }: Props) {
  // ───── Core State ─────
  const [selectedIncident, setSelectedIncident] = useState<Incident | undefined>(
    initialIncident || allIncidents[0]
  );
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<LifecyclePhase>('NEW');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // ───── Evidence State ─────
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [evidenceCollecting, setEvidenceCollecting] = useState(false);

  // ───── Mitigation State ─────
  const [mitigations, setMitigations] = useState<MitigationAction[]>([]);
  const [activeMitigation, setActiveMitigation] = useState<string | null>(null);

  // ───── Verification State ─────
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>([]);
  const [verifying, setVerifying] = useState(false);

  // ───── Timeline ─────
  const [lifecycleLog, setLifecycleLog] = useState<{ time: string; event: string; phase: LifecyclePhase }[]>([]);

  // ───── Refs ─────
  const phaseContainerRef = useRef<HTMLDivElement>(null);

  // ───── Derived ─────
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const confidenceData = useMemo(() => computeConfidence(evidenceItems), [evidenceItems]);
  const memories: RecalledMemory[] = investigation?.previousExperienceUsed || [];

  // ─────────────────────────────────────────────────────────
  // LIFECYCLE LOG
  // ─────────────────────────────────────────────────────────
  const addLog = useCallback((event: string, p: LifecyclePhase) => {
    setLifecycleLog(prev => [
      { time: new Date().toLocaleTimeString(), event, phase: p },
      ...prev,
    ]);
  }, []);

  // ─────────────────────────────────────────────────────────
  // PHASE 1: INVESTIGATE — Fetch AI analysis
  // ─────────────────────────────────────────────────────────
  const runInvestigation = useCallback(async (inc: Incident) => {
    setLoading(true);
    setPhase('INVESTIGATING');
    addLog('AI investigation dispatched', 'INVESTIGATING');
    setEvidenceItems([]);
    setMitigations([]);
    setVerificationChecks([]);

    try {
      const res = await fetch('/api/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: inc.id }),
      });

      let data;
      if (res.ok) {
        data = await res.json();
      } else {
        const fallbackRes = await fetch('/api/investigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incident: inc }),
        });
        data = await fallbackRes.json();
      }

      const result = data.investigation || data;
      setInvestigation(result);
      addLog('AI analysis complete — root cause hypothesis formed', 'INVESTIGATING');

      // Auto-generate evidence from investigation results
      generateEvidence(result, inc);
      setPhase('EVIDENCE_COLLECTED');
      addLog('Evidence correlation complete', 'EVIDENCE_COLLECTED');
    } catch (err) {
      console.error('Investigation failed:', err);
      addLog('Investigation failed — check connectivity', 'INVESTIGATING');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // ─────────────────────────────────────────────────────────
  // PHASE 2: EVIDENCE — Generate & correlate evidence
  // ─────────────────────────────────────────────────────────
  const generateEvidence = useCallback((result: InvestigationResult, inc: Incident) => {
    setEvidenceCollecting(true);
    const items: EvidenceItem[] = [];
    const now = new Date().toISOString();

    // Evidence from investigation results
    if (result.evidence) {
      result.evidence.forEach((ev, idx) => {
        items.push({
          id: `ev-${idx}`,
          type: 'metric',
          signal: ev,
          weight: 0.8 - idx * 0.1,
          category: 'supporting',
          source: 'AI Telemetry Analysis',
          timestamp: now,
        });
      });
    }

    // Evidence from symptoms
    inc.symptoms.forEach((sym, idx) => {
      items.push({
        id: `sym-${idx}`,
        type: 'log',
        signal: sym,
        weight: 0.6,
        category: 'supporting',
        source: 'Service Telemetry',
        timestamp: now,
      });
    });

    // Evidence from logs (error lines)
    const errorLogs = inc.logs.filter(l => l.includes('ERROR') || l.includes('Timeout') || l.includes('Exception'));
    errorLogs.slice(0, 3).forEach((log, idx) => {
      items.push({
        id: `log-${idx}`,
        type: 'log',
        signal: log.slice(0, 120),
        weight: 0.5,
        category: 'supporting',
        source: 'Error Logs',
        timestamp: now,
      });
    });

    // Memory-based evidence
    if (result.previousExperienceUsed?.length > 0) {
      items.push({
        id: 'mem-recall',
        type: 'memory',
        signal: `Historical pattern match: ${result.previousExperienceUsed[0].memory.title} (${result.previousExperienceUsed[0].relevanceLabel})`,
        weight: 0.9,
        category: 'supporting',
        source: 'Hindsight Memory',
        timestamp: now,
      });
    }

    // Missing evidence (what we couldn't verify)
    if (result.uncertainties) {
      result.uncertainties.forEach((unc, idx) => {
        items.push({
          id: `unc-${idx}`,
          type: 'correlation',
          signal: unc,
          weight: 0.4,
          category: 'missing',
          source: 'Gap Analysis',
          timestamp: now,
        });
      });
    }

    // Always add at least one "missing" if we have none
    if (items.filter(i => i.category === 'missing').length === 0) {
      items.push({
        id: 'missing-deploy',
        type: 'deploy',
        signal: 'No correlated deployment events found in the detection window',
        weight: 0.3,
        category: 'missing',
        source: 'Deploy Tracker',
        timestamp: now,
      });
    }

    setEvidenceItems(items);
    setEvidenceCollecting(false);
  }, []);

  // ─────────────────────────────────────────────────────────
  // PHASE 3: MITIGATION — Generate risk-aware action plan
  // ─────────────────────────────────────────────────────────
  const prepareMitigations = useCallback(() => {
    setPhase('MITIGATION_READY');
    addLog('Mitigation plan generated', 'MITIGATION_READY');

    const actions = investigation?.recommendedActions || [
      'Check database connection pool configuration',
      'Review recent deployments for breaking changes',
      'Scale up replicas to absorb load',
    ];

    const riskLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high', 'low', 'medium'];
    const mits: MitigationAction[] = actions.map((action, idx) => ({
      id: `mit-${idx}`,
      label: action,
      description: investigation?.whyTheseActions || 'Based on evidence correlation and historical pattern matching.',
      risk: riskLevels[idx % riskLevels.length],
      reversible: idx < 2,
      status: 'pending' as const,
      requiresApproval: riskLevels[idx % riskLevels.length] === 'high',
    }));

    setMitigations(mits);
  }, [investigation, addLog]);

  // ─────────────────────────────────────────────────────────
  // Execute a single mitigation action
  // ─────────────────────────────────────────────────────────
  const executeMitigation = useCallback(async (id: string) => {
    setActiveMitigation(id);
    setPhase('MITIGATING');

    setMitigations(prev =>
      prev.map(m => m.id === id ? { ...m, status: 'executing' as const } : m)
    );
    addLog(`Executing mitigation: ${mitigations.find(m => m.id === id)?.label}`, 'MITIGATING');

    // Simulate execution delay (in production this calls a real API)
    await new Promise(resolve => setTimeout(resolve, 1800 + Math.random() * 1200));

    const success = Math.random() > 0.15; // 85% success rate
    setMitigations(prev =>
      prev.map(m =>
        m.id === id
          ? {
              ...m,
              status: success ? 'done' as const : 'failed' as const,
              result: success ? 'Action completed successfully' : 'Action failed — rollback initiated',
              executedAt: new Date().toISOString(),
            }
          : m
      )
    );
    setActiveMitigation(null);
    addLog(
      success
        ? `Mitigation succeeded: ${mitigations.find(m => m.id === id)?.label}`
        : `Mitigation FAILED: ${mitigations.find(m => m.id === id)?.label} — rollback triggered`,
      'MITIGATING'
    );
  }, [mitigations, addLog]);

  // ─────────────────────────────────────────────────────────
  // PHASE 4: VERIFICATION — Multi-stage recovery check
  // ─────────────────────────────────────────────────────────
  const startVerification = useCallback(async () => {
    setPhase('VERIFYING');
    setVerifying(true);
    addLog('Verification engine started — checking recovery signals', 'VERIFYING');

    const checks: VerificationCheck[] = [
      { id: 'v1', label: 'Error Rate',      metric: 'error_rate_5m',     threshold: '< 1%',    status: 'pending' },
      { id: 'v2', label: 'P95 Latency',     metric: 'p95_latency_ms',    threshold: '< 300ms', status: 'pending' },
      { id: 'v3', label: 'Health Endpoint',  metric: '/healthz',          threshold: 'HTTP 200', status: 'pending' },
      { id: 'v4', label: 'DB Pool Active',   metric: 'db_pool_active',    threshold: '< 80%',   status: 'pending' },
      { id: 'v5', label: 'Queue Depth',      metric: 'msg_queue_depth',   threshold: '< 100',   status: 'pending' },
    ];
    setVerificationChecks(checks);

    // Run checks sequentially with visual progression
    for (let i = 0; i < checks.length; i++) {
      setVerificationChecks(prev =>
        prev.map((c, idx) => idx === i ? { ...c, status: 'checking' } : c)
      );

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));

      const passed = Math.random() > 0.12;
      const mockValues = ['0.3%', '187ms', '200 OK', '42%', '23'];
      const failValues = ['4.2%', '890ms', '503 ERR', '96%', '1847'];

      setVerificationChecks(prev =>
        prev.map((c, idx) =>
          idx === i
            ? {
                ...c,
                status: passed ? 'passed' : 'failed',
                currentValue: passed ? mockValues[i] : failValues[i],
                checkedAt: new Date().toISOString(),
              }
            : c
        )
      );
    }

    setVerifying(false);
    setPhase('VERIFIED');
    addLog('Verification complete — all signals assessed', 'VERIFIED');
  }, [addLog]);

  // ─────────────────────────────────────────────────────────
  // Re-evaluate: Refetch telemetry and update hypotheses
  // ─────────────────────────────────────────────────────────
  const reEvaluate = useCallback(() => {
    if (!selectedIncident) return;
    setPhase('NEW');
    addLog('Re-evaluation triggered — refreshing telemetry & hypotheses', 'NEW');
    runInvestigation(selectedIncident);
  }, [selectedIncident, runInvestigation, addLog]);

  // ─────────────────────────────────────────────────────────
  // Initial load
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedIncident) {
      setPhase('NEW');
      setLifecycleLog([]);
      addLog('Incident loaded', 'NEW');
      runInvestigation(selectedIncident);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncident?.id]);

  const handleIncidentResolved = useCallback((updated: Incident) => {
    setSelectedIncident(updated);
    setPhase('RETAINED');
    addLog('Experience retained in Hindsight Memory', 'RETAINED');
  }, [addLog]);

  // ─────────────────────────────────────────────────────────
  // Sparkline for telemetry mini-graph
  // ─────────────────────────────────────────────────────────
  const sparklinePath = useMemo(() => {
    const pts = DEFAULT_SPARK_POINTS;
    const max = Math.max(...pts);
    const w = 200;
    const h = 40;
    return pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────

  if (!selectedIncident) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
          <Search className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-sm font-medium">No active incidents found for investigation.</p>
        <p className="text-xs text-slate-500 mt-1">Create or select an incident to begin AI-assisted analysis.</p>
      </div>
    );
  }

  const supportingEvidence = evidenceItems.filter(e => e.category === 'supporting');
  const missingEvidence = evidenceItems.filter(e => e.category === 'missing');
  const completedMitigations = mitigations.filter(m => m.status === 'done').length;
  const passedVerifications = verificationChecks.filter(v => v.status === 'passed').length;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* ══════════════════════════════════════════════════════
          CSS ANIMATIONS (injected via style tag for component)
         ══════════════════════════════════════════════════════ */}
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
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50%      { box-shadow: 0 0 16px 4px rgba(239, 68, 68, 0.15); }
        }
        @keyframes progressPulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .anim-fade-in     { animation: fadeInUp 0.5s ease-out both; }
        .anim-fade-in-d1  { animation: fadeInUp 0.5s ease-out 0.1s both; }
        .anim-fade-in-d2  { animation: fadeInUp 0.5s ease-out 0.2s both; }
        .anim-fade-in-d3  { animation: fadeInUp 0.5s ease-out 0.3s both; }
        .anim-fade-scale  { animation: fadeInScale 0.4s ease-out both; }
        .anim-slide-right { animation: slideInRight 0.4s ease-out both; }
        .anim-pulse-glow  { animation: pulseGlow 2s ease-in-out infinite; }
        .anim-progress    { animation: progressPulse 1.5s ease-in-out infinite; }
        .anim-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }
        .investigation-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .investigation-card:hover {
          transform: translateY(-2px);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .phase-step {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .evidence-row {
          transition: all 0.3s ease;
        }
        .evidence-row:hover {
          background: rgba(20, 24, 36, 0.8);
          transform: translateX(4px);
        }
        .mitigation-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mitigation-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .verification-row {
          transition: all 0.3s ease;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          HEADER — Incident Identity + Phase Controls
         ══════════════════════════════════════════════════════ */}
      <div className="anim-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-red-400" />
              AI Investigation Lifecycle
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Evidence-driven analysis → Risk-aware mitigation → Verified recovery → Memory retention
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedIncident.id}
              onChange={(e) => {
                const found = allIncidents.find((i) => i.id === e.target.value);
                if (found) setSelectedIncident(found);
              }}
              className="bg-[#11141c] border border-[#1c2230] text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-500 font-mono cursor-pointer"
            >
              {allIncidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id} — {i.service}
                </option>
              ))}
            </select>
            <button
              onClick={reEvaluate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing...' : 'Re-evaluate'}</span>
            </button>
          </div>
        </div>

        {/* Incident Header Card */}
        <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-5 shadow-xl investigation-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0 anim-pulse-glow">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-white">{selectedIncident.id}</span>
                  <span className="text-sm font-bold text-white">{selectedIncident.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    {selectedIncident.service}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(selectedIncident.triggeredAt).toLocaleString()}
                  </span>
                  <span>•</span>
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
              </div>
            </div>

            {/* Mini telemetry sparkline */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <div className="text-[10px] text-slate-500 mb-1">Latency (last 15m)</div>
                <svg width="200" height="40" className="opacity-70">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(239,68,68,0.3)" />
                      <stop offset="100%" stopColor="rgba(239,68,68,0)" />
                    </linearGradient>
                  </defs>
                  <path d={sparklinePath} fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5" />
                  <path d={`${sparklinePath} L200,40 L0,40 Z`} fill="url(#sparkGrad)" />
                </svg>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white font-mono">
                  {confidenceData.score > 0 ? `${Math.round(confidenceData.score * 100)}%` : '—'}
                </div>
                <div className="text-[10px] text-slate-500">AI Confidence</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          LIFECYCLE PHASE STEPPER
         ══════════════════════════════════════════════════════ */}
      <div className="anim-fade-in-d1" ref={phaseContainerRef}>
        <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-4 shadow-xl overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {PHASE_ORDER.map((p, idx) => {
              const meta = PHASE_META[p];
              const Icon = meta.icon;
              const isActive = p === phase;
              const isPast = idx < phaseIndex;
              const isFuture = idx > phaseIndex;

              return (
                <React.Fragment key={p}>
                  {idx > 0 && (
                    <div className={`flex-shrink-0 w-6 h-[2px] rounded-full transition-all duration-500 ${
                      isPast ? 'bg-emerald-500/60' : isActive ? 'bg-red-500/40 anim-shimmer' : 'bg-[#1c2230]'
                    }`} />
                  )}
                  <div
                    className={`phase-step flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap cursor-default border ${
                      isActive
                        ? 'bg-red-500/15 border-red-500/30 text-white font-semibold shadow-lg shadow-red-900/20'
                        : isPast
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-transparent border-transparent text-slate-600'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isActive ? (
                      <Icon className={`w-3.5 h-3.5 ${meta.color} ${loading || verifying ? 'animate-spin' : ''}`} />
                    ) : (
                      <CircleDot className={`w-3 h-3 ${isFuture ? 'text-slate-700' : meta.color}`} />
                    )}
                    <span>{meta.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT GRID
         ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 anim-fade-in-d2">

        {/* ─── LEFT COLUMN (8 cols): Active Phase Content ─── */}
        <div className="lg:col-span-8 space-y-6">

          {/* ──────── LOADING SKELETON ──────── */}
          {loading && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl anim-fade-scale relative overflow-hidden">
              <div className="absolute inset-0 anim-shimmer pointer-events-none" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Investigating...</h2>
                  <p className="text-[11px] text-slate-400">Gathering telemetry, correlating logs, querying Hindsight memory</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Fetching service metrics...', 'Scanning error logs...', 'Querying Hindsight memory bank...', 'Correlating deployment events...'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-400" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-emerald-400' : i === 2 ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className={i <= 2 ? 'text-slate-300' : 'text-slate-600'}>{step}</span>
                    {i < 2 && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />}
                    {i === 2 && <Loader2 className="w-3 h-3 text-blue-400 animate-spin ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────── PHASE: AI ANALYSIS & ROOT CAUSE ──────── */}
          {!loading && investigation && (phase === 'EVIDENCE_COLLECTED' || phase === 'INVESTIGATING') && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl investigation-card anim-fade-scale">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2230]">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white">Root Cause Hypothesis</h2>
                  <p className="text-[11px] text-slate-400">AI synthesis from {evidenceItems.length} evidence signals</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                  <Gauge className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {Math.round(confidenceData.score * 100)}%
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {/* Root cause text */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#141824] to-[#11141c] border border-[#1e2433]">
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {investigation.likelyRootCause || 'Root cause analysis in progress...'}
                  </p>
                </div>

                {/* Confidence Breakdown */}
                <div className="p-3 rounded-xl bg-[#141824]/60 border border-[#1c2230]">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <BarChart3 className="w-3 h-3" />
                    Confidence Reasoning
                  </div>
                  <p className="text-xs text-slate-400">{confidenceData.breakdown}</p>
                  <div className="mt-2 h-2 rounded-full bg-[#1c2230] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.round(confidenceData.score * 100)}%`,
                        background: confidenceData.score > 0.7
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : confidenceData.score > 0.4
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                      }}
                    />
                  </div>
                </div>

                {/* Action: Proceed to Evidence Detail or Mitigate */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={prepareMitigations}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold shadow-lg shadow-orange-950/30 transition-all cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Prepare Mitigations
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={reEvaluate}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-200 text-xs font-semibold border border-[#222a3d] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Re-evaluate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────── PHASE: EVIDENCE DETAIL ──────── */}
          {!loading && evidenceItems.length > 0 && (phase === 'EVIDENCE_COLLECTED' || phase === 'INVESTIGATING') && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl investigation-card anim-fade-in-d1">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2230]">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white">Evidence Correlation</h2>
                  <p className="text-[11px] text-slate-400">
                    {supportingEvidence.length} supporting · {missingEvidence.length} missing signals
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {/* Supporting Evidence */}
                {supportingEvidence.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Supporting Evidence ({supportingEvidence.length})
                    </div>
                    <div className="space-y-1.5">
                      {supportingEvidence.map((ev, idx) => (
                        <div key={ev.id} className="evidence-row flex items-start gap-3 p-2.5 rounded-lg border border-transparent cursor-default"
                          style={{ animationDelay: `${idx * 0.05}s` }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 leading-relaxed truncate">{ev.signal}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                              <span className="flex items-center gap-0.5">
                                {ev.type === 'log' && <Terminal className="w-2.5 h-2.5" />}
                                {ev.type === 'metric' && <Activity className="w-2.5 h-2.5" />}
                                {ev.type === 'memory' && <Brain className="w-2.5 h-2.5" />}
                                {ev.type === 'deploy' && <Database className="w-2.5 h-2.5" />}
                                {ev.type === 'correlation' && <Network className="w-2.5 h-2.5" />}
                                {ev.source}
                              </span>
                              <span>weight: {(ev.weight * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Evidence */}
                {missingEvidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1c2230]">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Missing / Unverified ({missingEvidence.length})
                    </div>
                    <div className="space-y-1.5">
                      {missingEvidence.map((ev) => (
                        <div key={ev.id} className="evidence-row flex items-start gap-3 p-2.5 rounded-lg border border-transparent cursor-default">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 leading-relaxed truncate">{ev.signal}</p>
                            <span className="text-[10px] text-slate-600">{ev.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── PHASE: MITIGATION ──────── */}
          {(phase === 'MITIGATION_READY' || phase === 'MITIGATING') && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl investigation-card anim-fade-scale">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2230]">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white">Mitigation Actions</h2>
                  <p className="text-[11px] text-slate-400">
                    Execute one at a time → Verify → Proceed. {completedMitigations}/{mitigations.length} complete.
                  </p>
                </div>
                {completedMitigations > 0 && completedMitigations >= mitigations.filter(m => m.status !== 'skipped').length && (
                  <button
                    onClick={startVerification}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/30 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Start Verification
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {mitigations.map((mit, idx) => (
                  <div
                    key={mit.id}
                    className={`mitigation-card p-4 rounded-xl border ${
                      mit.status === 'executing'
                        ? 'bg-orange-500/5 border-orange-500/30'
                        : mit.status === 'done'
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : mit.status === 'failed'
                            ? 'bg-rose-500/5 border-rose-500/20'
                            : 'bg-[#141824] border-[#1c2230]'
                    }`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {mit.status === 'executing' && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />}
                          {mit.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {mit.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                          {mit.status === 'pending' && <CircleDot className="w-3.5 h-3.5 text-slate-500" />}
                          {mit.status === 'skipped' && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                          <span className="text-xs font-semibold text-white">{mit.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            mit.risk === 'high'
                              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                              : mit.risk === 'medium'
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          }`}>
                            {mit.risk === 'high' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                            {mit.risk} risk
                          </span>
                          <span className="flex items-center gap-0.5">
                            {mit.reversible ? <Unlock className="w-2.5 h-2.5 text-emerald-400" /> : <Lock className="w-2.5 h-2.5 text-rose-400" />}
                            {mit.reversible ? 'Reversible' : 'Irreversible'}
                          </span>
                          {mit.requiresApproval && (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />
                              Requires approval
                            </span>
                          )}
                        </div>
                        {mit.result && (
                          <p className={`text-[11px] mt-2 ${mit.status === 'done' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {mit.result}
                          </p>
                        )}
                      </div>
                      {mit.status === 'pending' && (
                        <button
                          onClick={() => executeMitigation(mit.id)}
                          disabled={!!activeMitigation}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/80 hover:bg-orange-500 text-white text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40"
                        >
                          <Play className="w-3 h-3" />
                          Execute
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────── PHASE: VERIFICATION ──────── */}
          {(phase === 'VERIFYING' || phase === 'VERIFIED') && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl investigation-card anim-fade-scale">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#1c2230]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-white">Recovery Verification</h2>
                  <p className="text-[11px] text-slate-400">
                    {passedVerifications}/{verificationChecks.length} checks passed
                    {verifying && ' — scanning...'}
                  </p>
                </div>
                {phase === 'VERIFIED' && (
                  <button
                    onClick={() => { setPhase('RESOLVING'); setIsResolveModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Resolve & Retain
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {verificationChecks.map((check) => (
                  <div key={check.id} className={`verification-row flex items-center gap-4 p-3 rounded-xl border ${
                    check.status === 'passed'
                      ? 'bg-emerald-500/5 border-emerald-500/15'
                      : check.status === 'failed'
                        ? 'bg-rose-500/5 border-rose-500/15'
                        : check.status === 'checking'
                          ? 'bg-cyan-500/5 border-cyan-500/15'
                          : 'bg-[#141824] border-[#1c2230]'
                  }`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      {check.status === 'pending' && <CircleDot className="w-4 h-4 text-slate-600" />}
                      {check.status === 'checking' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                      {check.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {check.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400" />}
                      {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-white">{check.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{check.metric} — threshold: {check.threshold}</div>
                    </div>
                    {check.currentValue && (
                      <div className={`text-xs font-mono font-bold ${
                        check.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {check.currentValue}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {phase === 'VERIFIED' && verificationChecks.some(c => c.status === 'failed') && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Some checks failed — consider re-evaluating before resolving
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────── PHASE: RESOLVED / RETAINED ──────── */}
          {(phase === 'RESOLVED' || phase === 'RETAINED') && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl anim-fade-scale">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  {phase === 'RETAINED' ? (
                    <Brain className="w-6 h-6 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {phase === 'RETAINED' ? 'Experience Retained in Hindsight' : 'Incident Resolved'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {phase === 'RETAINED'
                      ? 'This experience is now part of the AI memory bank and will inform future investigations.'
                      : 'Click "Resolve & Retain" to save this experience for future AI recall.'}
                  </p>
                </div>
              </div>
              {phase === 'RESOLVED' && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                >
                  <Brain className="w-4 h-4" />
                  Retain Experience in Hindsight
                </button>
              )}
            </div>
          )}

          {/* ──────── HINDSIGHT MEMORY PANEL ──────── */}
          {!loading && memories.length > 0 && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 shadow-xl investigation-card anim-fade-in-d3">
              <div className="flex items-center justify-between pb-3 border-b border-[#1c2230]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Hindsight Memory Match
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {investigation?.memoryRecall?.mode === 'hindsight' && investigation?.memoryRecall?.status !== 'fallback'
                        ? 'Live semantic match from Hindsight Cloud'
                        : 'Semantic match from Local Demo Memory'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  investigation?.memoryRecall?.mode === 'hindsight' && investigation?.memoryRecall?.status !== 'fallback'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                }`}>
                  {investigation?.memoryRecall?.mode === 'hindsight' && investigation?.memoryRecall?.status !== 'fallback'
                    ? 'Hindsight Cloud'
                    : 'Local Demo Memory'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {memories.map((recalled, idx) => (
                  <MemoryCard key={idx} recalled={recalled} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN (4 cols): Lifecycle Log + Summary ─── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Confidence Panel */}
          <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-5 shadow-xl investigation-card anim-slide-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Evidence-Based Confidence
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative w-28 h-28">
                {/* Confidence ring */}
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(30,36,51,0.8)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={confidenceData.score > 0.7 ? '#10b981' : confidenceData.score > 0.4 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${confidenceData.score * 264} 264`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white font-mono">
                    {confidenceData.score > 0 ? Math.round(confidenceData.score * 100) : '—'}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">confidence</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Supporting</span>
                <span className="font-mono text-emerald-400">{supportingEvidence.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-400" /> Missing</span>
                <span className="font-mono text-amber-400">{missingEvidence.length}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-red-400" /> Memory Matches</span>
                <span className="font-mono text-red-400">{memories.length}</span>
              </div>
              {mitigations.length > 0 && (
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-orange-400" /> Mitigations</span>
                  <span className="font-mono text-orange-400">{completedMitigations}/{mitigations.length}</span>
                </div>
              )}
              {verificationChecks.length > 0 && (
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> Verifications</span>
                  <span className="font-mono text-cyan-400">{passedVerifications}/{verificationChecks.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Investigation Summary */}
          {!loading && investigation && (
            <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-5 shadow-xl investigation-card anim-slide-right" style={{ animationDelay: '0.1s' }}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Investigation Summary
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {investigation.summary || investigation.likelyRootCause}
              </p>
              {investigation.historicalContext && (
                <div className="mt-3 p-2.5 rounded-lg bg-[#141824] border border-[#1c2230]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-red-400 mb-1">Historical Context</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{investigation.historicalContext}</p>
                </div>
              )}
            </div>
          )}

          {/* Lifecycle Activity Log */}
          <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-5 shadow-xl investigation-card anim-slide-right" style={{ animationDelay: '0.2s' }}>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Lifecycle Activity ({lifecycleLog.length})
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {lifecycleLog.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No activity yet</p>
              ) : (
                lifecycleLog.map((entry, idx) => {
                  const meta = PHASE_META[entry.phase];
                  return (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap mt-0.5">{entry.time}</span>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        meta.color.replace('text-', 'bg-')
                      }`} />
                      <span className="text-slate-400 leading-relaxed">{entry.event}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-5 shadow-xl investigation-card anim-slide-right" style={{ animationDelay: '0.3s' }}>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-3">Quick Actions</div>
            <div className="space-y-2">
              <button
                onClick={reEvaluate}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs font-medium border border-[#1c2230] transition-all cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                Re-fetch Telemetry & Re-evaluate
              </button>
              {phase !== 'MITIGATION_READY' && phase !== 'MITIGATING' && !loading && investigation && (
                <button
                  onClick={prepareMitigations}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs font-medium border border-[#1c2230] transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                  Generate Mitigation Plan
                </button>
              )}
              {(phase === 'VERIFIED' || phase === 'RESOLVED') && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold border border-red-500/25 transition-all cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5 text-red-400" />
                  Resolve & Retain in Hindsight
                </button>
              )}
              <button
                onClick={() => setIsResolveModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs font-medium border border-[#1c2230] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Quick Resolve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RESOLUTION MODAL
         ══════════════════════════════════════════════════════ */}
      {isResolveModalOpen && (
        <ResolutionModal
          incident={selectedIncident}
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          onResolved={handleIncidentResolved}
        />
      )}
    </div>
  );
}
