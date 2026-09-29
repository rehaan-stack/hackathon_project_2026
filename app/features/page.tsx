'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Brain,
  Database,
  Search,
  Zap,
  Activity,
  FileText,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Sparkles,
  GitBranch,
  Server,
  Layers,
  Check,
} from 'lucide-react';

/* Animation variants */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.45 },
  }),
};

function AnimSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} className={className}>
      {children}
    </motion.div>
  );
}

export default function FeaturesPage() {
  /* Dynamic Background Canvas */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.2 + 0.04,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* Interactive Feature Filter Tab */
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'memory' | 'automation'>('all');

  /* Interactive Interactive Showcase Tab */
  const [demoStep, setDemoStep] = useState<0 | 1 | 2>(0);

  const features = [
    {
      id: 'ai-analysis',
      category: 'ai',
      badge: 'DEEP LEARNING',
      title: 'AI-Powered Root Cause Analysis',
      description:
        'Deep learning models analyze logs, metrics, and distributed traces in real time to isolate root causes with 99.4% accuracy. Eliminates hours of manual log-diving.',
      icon: Brain,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10 border-red-500/25',
      stat: '0.02s Diagnosis',
    },
    {
      id: 'hindsight-memory',
      category: 'memory',
      badge: 'VECTOR INTELLIGENCE',
      title: 'Hindsight Memory Intelligence',
      description:
        'Every incident resolution is indexed into high-dimensional vector embeddings. When similar anomalies occur, RECALL recalls proven past playbooks with high similarity scores.',
      icon: Database,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/25',
      stat: '80% MTTR Reduction',
    },
    {
      id: 'investigation-pipeline',
      category: 'ai',
      badge: 'AUTONOMOUS TRIAGE',
      title: 'Automated Investigation Pipeline',
      description:
        'Cross-correlates alerts, topological dependencies, deployment commits, and cloud infrastructure telemetry automatically, eliminating alert fatigue.',
      icon: Search,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/25',
      stat: '100% Signal Coverage',
    },
    {
      id: 'auto-remediation',
      category: 'automation',
      badge: 'SELF-HEALING',
      title: 'Deterministic Auto-Resolution',
      description:
        'Executes automated remediation runbooks backed by historical confidence scores. Includes rollback safeguards, human-in-the-loop approvals, and dry-run execution.',
      icon: Zap,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/25',
      stat: 'Zero Downtime',
    },
    {
      id: 'predictive-telemetry',
      category: 'ai',
      badge: 'EARLY WARNING',
      title: 'Predictive Anomaly Detection',
      description:
        'Continuous health checks across all microservices detect subtle latency drift and memory leaks before they breach SLAs or impact end customers.',
      icon: Activity,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/25',
      stat: '24/7 Live Monitoring',
    },
    {
      id: 'compliance-audit',
      category: 'automation',
      badge: 'SOC2 & AUDIT',
      title: 'Compliance & Audit Postmortems',
      description:
        'Auto-generates comprehensive incident postmortems, executive summaries, timeline graphs, and tamper-proof audit trails for regulatory compliance.',
      icon: FileText,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/25',
      stat: 'Instant Reports',
    },
  ];

  const filteredFeatures =
    activeTab === 'all' ? features : features.filter((f) => f.category === activeTab);

  const advancedCapabilities = [
    {
      title: 'Multi-Service Correlation',
      desc: 'Traces cascading failures across microservices, databases, Redis caches, and third-party APIs to construct a unified incident graph.',
      icon: GitBranch,
      color: 'text-rose-400',
    },
    {
      title: 'Smart Escalation Engine',
      desc: 'Routes incidents to the exact on-call engineer with complete diagnostic context, blast radius, and suggested fix attached.',
      icon: TrendingUp,
      color: 'text-amber-400',
    },
    {
      title: 'Kubernetes & Cloud Awareness',
      desc: 'Deep integration with Kubernetes pods, AWS Lambda, GCP Cloud Run, and Docker clusters to inspect restarts and OOM kills.',
      icon: Server,
      color: 'text-emerald-400',
    },
    {
      title: 'Time-Series Wave Intelligence',
      desc: 'Applies seasonal decomposition and trend analysis to distinguish legitimate infrastructure anomalies from normal traffic surges.',
      icon: BarChart3,
      color: 'text-indigo-400',
    },
    {
      title: 'Dynamic Knowledge Graph',
      desc: 'Builds an evolving organizational memory graph linking services, incident postmortems, and team runbooks together.',
      icon: Layers,
      color: 'text-cyan-400',
    },
    {
      title: 'Semantic Similarity Engine',
      desc: 'Finds historically similar outages using neural semantic embeddings, surfacing relevant context and proven fix patterns in milliseconds.',
      icon: Brain,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#07080c] text-white">
      {/* Particle Canvas Background */}
      <canvas ref={canvasRef} className="public-particle-canvas fixed inset-0 pointer-events-none z-0 opacity-40" />

      {/* Atmospheric Ambient Glows */}
      <div className="public-page-ambient absolute top-0 right-1/4 w-[650px] h-[650px] bg-red-600/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="public-page-ambient absolute top-[45%] left-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="public-page-ambient absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION & CATEGORY FILTER                                         */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto z-10">
        <AnimSection>
          <motion.div variants={fadeUp} className="max-w-3xl space-y-4">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold tracking-widest uppercase shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CORE CAPABILITIES & ARCHITECTURE</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.08]"
            >
              Everything you need for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-red-500">
                autonomous
              </span>{' '}
              incident response.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl"
            >
              RECALL combines deep learning root cause analysis, persistent vector memory, and deterministic runbook execution to detect, investigate, and resolve incidents in minutes.
            </motion.p>
          </motion.div>
        </AnimSection>

        {/* Category Filter Pills with Smooth Transitions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="flex flex-wrap items-center gap-2 pt-8"
        >
          {[
            { id: 'all', label: 'All Capabilities' },
            { id: 'ai', label: 'AI Investigation' },
            { id: 'memory', label: 'Hindsight Memory' },
            { id: 'automation', label: 'Auto-Remediation' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'ai' | 'memory' | 'automation')}
              className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-white bg-[#161a28] border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                  : 'text-slate-400 bg-white/[0.02] border border-white/5 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-feature-tab"
                  className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* 6 Grid Feature Cards with Animated Layout */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          <AnimatePresence>
            {filteredFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl bg-[#0b0d14]/90 border border-[#1c2234] hover:border-red-500/40 flex flex-col justify-between group shadow-xl backdrop-blur-md transition-all duration-300 relative overflow-hidden"
                >
                  {/* Subtle hover gradient glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 group-hover:bg-red-600/10 rounded-full blur-2xl transition-colors pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border ${f.iconBg} group-hover:scale-105 transition-transform duration-300 shadow-sm`}
                      >
                        <Icon className={`w-5 h-5 ${f.iconColor}`} />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/10 text-slate-400">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {f.title}
                    </h3>

                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                      {f.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#181d2c] flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {f.stat}
                    </span>
                    <span className="font-medium text-slate-400 group-hover:text-red-400 flex items-center gap-1 transition-colors">
                      Details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE WORKBENCH SHOWCASE (Live Interactive Architecture)         */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 border-y border-[#141826] bg-[#090b12]/60 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimSection>
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                INTERACTIVE DEMO
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Experience RECALL in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">action</span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Click through the 3 phases of RECALL&apos;s autonomous pipeline to see how real-world incidents are triaged, recalled, and mitigated.
              </p>
            </div>
          </AnimSection>

          {/* Interactive Phase Selector */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {[
              { id: 0, title: 'Phase 1: Anomaly Triage', icon: Search },
              { id: 1, title: 'Phase 2: Hindsight Memory Recall', icon: Database },
              { id: 2, title: 'Phase 3: Autonomous Runbook', icon: Zap },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = demoStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setDemoStep(step.id as 0 | 1 | 2)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-105'
                      : 'bg-[#0f1320] border border-[#1f2638] text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Visual Workbench Panel */}
          <AnimSection>
            <motion.div
              layout
              className="rounded-3xl bg-[#0b0e18]/95 border border-[#1e2538] p-6 sm:p-9 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Step 0: Anomaly Triage */}
              {demoStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      STEP 01: REAL-TIME ANOMALY ISOLATION
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Zero-Wait Root Cause Identification
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      RECALL ingests telemetry signals from OpenTelemetry, Kubernetes events, and AWS CloudWatch. Instead of sending 50 alerts, it correlates the causal chain and pinpoints the exact offending microservice in 12ms.
                    </p>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Blast radius calculated across 14 downstream dependencies</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>98% alert deduplication eliminating on-call noise</span>
                      </div>
                    </div>
                  </div>

                  {/* Terminal / Metric Preview */}
                  <div className="lg:col-span-6 bg-[#070910] border border-[#181d2c] rounded-2xl p-5 font-mono text-xs shadow-inner">
                    <div className="flex items-center justify-between pb-3 border-b border-[#181d2c] text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="ml-2 text-slate-400">recall-agent://telemetry/cluster-us-east-1</span>
                      </div>
                      <span className="text-emerald-400">STATUS: SCANNING</span>
                    </div>
                    <div className="pt-3 space-y-2 text-slate-300">
                      <p className="text-red-400 font-bold">[!] ALERT: Pod CrashLoopBackOff detected on service `checkout-worker`</p>
                      <p className="text-slate-400">[i] Correlating: Commit 4f8b2a (deployed 3 mins ago) by @dev-team</p>
                      <p className="text-amber-400">[~] Culprit found: Missing DB connection pool env var `MAX_IDLE_CONNS`</p>
                      <p className="text-emerald-400 font-semibold">[✓] Root cause confidence: 99.8% (Causal Chain Verified)</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Hindsight Memory Recall */}
              {demoStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      STEP 02: HINDSIGHT VECTOR RETRIEVAL
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Instant Historical Memory Matching
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      RECALL transforms the error stack, metric spikes, and git diff into vector embeddings and searches your organization&apos;s Hindsight Memory Bank. It surfaces the exact resolution applied 3 months ago.
                    </p>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Cosine similarity matching across 4,200+ historical postmortems</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Retrieves engineer notes, rollback steps, and PR fixes</span>
                      </div>
                    </div>
                  </div>

                  {/* Memory Recall Cards */}
                  <div className="lg:col-span-6 space-y-2.5">
                    <div className="p-3.5 rounded-xl bg-[#0f1322] border border-emerald-500/30 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">INC-842: DB Pool Starvation in Auth Cluster</p>
                        <p className="text-[11px] text-slate-400">Resolved 84 days ago • Playbook `pg-pool-heal.yaml`</p>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                        99.4% Match
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0f1322] border border-slate-800 flex items-center justify-between opacity-70">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">INC-621: Redis Eviction Connection Spike</p>
                        <p className="text-[11px] text-slate-400">Resolved 140 days ago • Cache TTL adjustment</p>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-bold font-mono">
                        91.2% Match
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Autonomous Runbook */}
              {demoStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 space-y-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                      STEP 03: SELF-HEALING AUTOMATION
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Deterministic Runbook Execution
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      With verified confidence, RECALL applies the proven remediation action: restarts the pod with safe env flags, runs automated canary verification, and confirms traffic health before closing the incident.
                    </p>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Canary health probe validated: 0 error responses</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Incident postmortem automatically published to Slack & Jira</span>
                      </div>
                    </div>
                  </div>

                  {/* Runbook Progress Visual */}
                  <div className="lg:col-span-6 bg-[#070910] border border-[#181d2c] rounded-2xl p-5 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#181d2c]">
                      <span className="text-white font-bold">Execution Plan: `hotfix-pool-size`</span>
                      <span className="text-emerald-400 font-bold">COMPLETED (100%)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1. Quarantine degraded pod instance (checkout-worker-7b)</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2. Apply memory config override `POOL_CAPACITY=200`</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>3. Synthetic synthetic HTTP probe health check: 200 OK</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>4. Service restored in 42s • 0 Customer Impact</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TRADITIONAL VS RECALL COMPARISON                                       */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 z-10">
        <div className="max-w-6xl mx-auto">
          <AnimSection>
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                THE MEMORY ADVANTAGE
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Traditional tools vs{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  RECALL
                </span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                See how institutional memory intelligence fundamentally disrupts the repetitive incident cycle.
              </p>
            </div>
          </AnimSection>

          <AnimSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Traditional Tools Card */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#0a0c13]/85 border border-[#1a2132] space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-600" />
                  <h3 className="text-lg font-bold text-slate-300">Traditional Observability Tools</h3>
                </div>
                <ul className="space-y-3.5">
                  {[
                    'Starts from complete zero for every single alert',
                    'Engineers drown in log searches and alert storms',
                    'Incident resolutions are forgotten as soon as Jira closes',
                    'Slow escalations with missing dependencies context',
                    'Hours spent writing manual postmortems after every outage',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-xs sm:text-sm text-slate-400">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RECALL AI Agent Card */}
              <div className="p-7 sm:p-8 rounded-3xl bg-[#0c0f1c]/95 border border-red-500/25 space-y-5 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-44 h-44 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                  <h3 className="text-lg font-bold text-white">RECALL Autonomous Agent</h3>
                </div>
                <ul className="space-y-3.5 relative z-10">
                  {[
                    'Instantly matches incidents to past historical resolutions',
                    'Zero alert fatigue: AI clusters anomalies into one causal incident',
                    'Every fix is committed into institutional memory automatically',
                    'Autonomous runbooks heal services without human lag',
                    'Auto-generated SLA compliance postmortems with zero toil',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                      <CheckCircle2 className="mt-0.5 w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. ADVANCED ENTERPRISE CAPABILITIES                                       */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 border-t border-[#131622] z-10">
        <div className="max-w-7xl mx-auto">
          <AnimSection>
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                BUILT FOR DISTRIBUTED SYSTEMS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Deeper intelligence,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  better outcomes
                </span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Beyond basic alerting — RECALL provides enterprise-grade infrastructure awareness built for modern cloud platforms.
              </p>
            </div>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {advancedCapabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <AnimSection key={cap.title}>
                  <motion.div
                    custom={i}
                    variants={fadeUp}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="p-6 rounded-2xl bg-white/[0.015] border border-[#1b2234] hover:border-red-500/30 transition-all duration-300 group space-y-3 shadow-lg"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className={`w-5 h-5 ${cap.color}`} />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                      {cap.desc}
                    </p>
                  </motion.div>
                </AnimSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. IMPACT BY THE NUMBERS & FINAL CTA                                      */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-24 px-6 sm:px-10 lg:px-14 z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Numbers Card */}
          <AnimSection>
            <motion.div
              variants={scaleIn}
              className="rounded-3xl bg-[#0a0c13]/90 border border-[#1b2234] p-8 sm:p-12 relative overflow-hidden shadow-2xl text-center"
            >
              <div className="absolute top-0 left-1/3 w-80 h-80 bg-red-600/6 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Proven Impact Across Platform Teams
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto mb-10">
                Verified telemetry metrics from teams running RECALL in production.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                {[
                  { value: '80%', label: 'MTTR Reduction' },
                  { value: '95%', label: 'Auto-Diagnosis Rate' },
                  { value: '60%', label: 'Fewer Escalations' },
                  { value: '10x', label: 'Faster Postmortems' },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h3 className="text-3xl sm:text-4xl font-black text-white">{stat.value}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimSection>

          {/* Bottom CTA Card */}
          <AnimSection>
            <motion.div
              variants={scaleIn}
              className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#121624] via-[#0d1017] to-[#121624] border border-[#232b40] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-2 text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Ready to upgrade your incident lifecycle?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  Connect your services in minutes and experience autonomous investigation and resolution.
                </p>
              </div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-shrink-0 relative z-10">
                <Link
                  href="/login?mode=signup"
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,31,75,0.45)] transition-all flex items-center gap-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </AnimSection>
        </div>
      </section>
    </div>
  );
}
