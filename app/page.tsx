'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Zap,
  CheckCircle2,
  Shield,
  Database,
  Search,
  Activity,
  Clock,
  TrendingUp,
  BarChart3,
  Lock,
  Globe,
  Sparkles,
  ChevronRight,
  Server,
  Cpu,
} from 'lucide-react';
import { RecallLogo, RecallWordmark } from '@/components/icons/RecallLogo';

/* ============ ANIMATION HELPERS ============ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============ MAIN HOME PAGE ============ */

export default function PublicHomePage() {
  /* Dynamic Background Canvas */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showIntro, setShowIntro] = React.useState(true);

  useEffect(() => {
    const isCompactViewport = window.matchMedia('(max-width: 767px)').matches;
    const timer = window.setTimeout(() => setShowIntro(false), isCompactViewport ? 650 : 2200);
    return () => window.clearTimeout(timer);
  }, []);

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
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.25 + 0.05,
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

  return (
    <div className="relative overflow-hidden bg-[#07080c] text-white">
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.025, filter: 'blur(4px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#07080c]"
            aria-label="Loading RECALL"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,45,85,0.19),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(255,122,26,0.08),transparent_36%)]" />
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(circle_at_center,black,transparent_68%)]" />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="relative flex h-44 w-44 items-center justify-center rounded-[2.25rem] border border-rose-400/20 bg-[#0d0d16]/75 shadow-[0_0_90px_rgba(255,45,85,0.22)] backdrop-blur-xl sm:h-52 sm:w-52">
                <RecallLogo className="h-40 w-40 sm:h-48 sm:w-48" priority />
              </div>
              <RecallWordmark className="mt-7 text-3xl sm:text-4xl" />
              <p className="mt-2 font-mono text-[10px] tracking-[0.22em] text-emerald-400 sm:text-xs">INITIALIZING MEMORY CORE</p>
              <div className="mt-5 h-px w-36 overflow-hidden bg-white/10">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="h-full w-1/2 bg-gradient-to-r from-transparent via-rose-400 to-transparent"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="public-particle-canvas fixed inset-0 pointer-events-none z-0 opacity-40" />

      {/* Atmospheric Glow Elements */}
      <div className="public-page-ambient absolute top-0 right-1/4 w-[650px] h-[650px] bg-red-600/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="public-page-ambient absolute top-[35%] left-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="public-page-ambient absolute bottom-1/4 right-0 w-[450px] h-[450px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (Tightly adjusted, matching Image 1)                      */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-16 lg:pt-14 lg:pb-20 px-6 lg:px-12 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] font-black tracking-tight leading-[1.06]"
            >
              Detect. Investigate.{' '}
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-red-500">
                Resolve.
              </span>{' '}
              Faster.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed"
            >
              RECALL is an autonomous AI agent that analyzes incidents, recalls solutions
              from past experience, and resolves issues before they escalate — powered by
              memory intelligence and real-time automation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-wrap items-center gap-3.5 pt-2"
            >
              <Link
                href="/login?mode=signup"
                className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,31,75,0.4)] hover:shadow-[0_0_35px_rgba(255,31,75,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/features"
                className="group px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-slate-500 text-slate-200 font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5"
              >
                <span>Learn More</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Link>
            </motion.div>

            {/* Micro trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex flex-wrap items-center gap-5 pt-2 text-xs text-slate-400"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 24/7 Autonomous Operation
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Data Leakage
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> SOC2 Ready
              </span>
            </motion.div>
          </div>

          {/* Right Column: centered RECALL memory core */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="lg:col-span-5 relative flex items-center justify-center"
          >
            {/* Deep Volumetric Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-red-600/25 via-rose-500/20 to-emerald-500/10 rounded-3xl blur-3xl opacity-80" />

            {/* Cybernetic Intelligence Enclosure */}
            <div className="relative flex min-h-[430px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c0f1c]/95 via-[#080a13]/98 to-[#05060b]/98 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(255,32,78,0.18)] backdrop-blur-2xl sm:min-h-[470px] sm:p-8">
              
              {/* Card Top HUD Status Bar */}
              <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
                  </div>
                  <span className="text-[11px] font-bold text-white tracking-widest uppercase">
                    AI RECALL CORE v3.4
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                    0.2ms LATENCY
                  </span>
                </div>
              </div>

              {/* Animated memory-cube brand core */}
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-9 sm:py-12">
                
                {/* Concentric Rotating HUD Orbit Rings */}
                <div className="absolute w-[240px] h-[240px] rounded-full border border-red-500/15 border-dashed animate-spin pointer-events-none" style={{ animationDuration: '35s' }} />
                <div className="absolute w-[300px] h-[300px] rounded-full border border-red-500/[0.08] pointer-events-none" />
                <div className="absolute w-[180px] h-[180px] bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

                {/* Floating holographic memory cube */}
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative group cursor-pointer"
                >
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] border border-rose-400/20 bg-gradient-to-br from-[#1d1020]/90 via-[#100d17]/90 to-[#090b12] shadow-[0_20px_60px_rgba(255,32,82,0.3)] transition-all duration-300 group-hover:scale-105 sm:h-52 sm:w-52">
                    <div className="absolute inset-3 rounded-[1.5rem] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    <RecallLogo className="relative z-10 h-40 w-40 sm:h-48 sm:w-48" priority />
                  </div>

                  {/* Volumetric Floor Glow */}
                  <div className="w-28 h-5 bg-red-500/30 blur-xl mx-auto rounded-full mt-3" />
                </motion.div>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-2 border-t border-white/[0.06] pt-4 font-mono text-[10px] tracking-[0.16em] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                <span>PRIVATE MEMORY WORKSPACE ACTIVE</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS STRIP (Clean, compact, no bloated spacing)                      */}
        {/* ========================================================================= */}
        <AnimatedSection className="mt-14 sm:mt-16">
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 rounded-2xl bg-[#0b0d14]/80 border border-[#1b2132] backdrop-blur-md overflow-hidden shadow-xl"
          >
            {[
              { value: '100%', label: 'Incident Visibility', icon: Globe },
              { value: '42m', label: 'Avg. MTTR Reduction', icon: Clock },
              { value: '6+', label: 'Agent Modules', icon: Cpu },
              { value: '99.8%', label: 'Accuracy Rate', icon: Activity },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  custom={i}
                  variants={scaleIn}
                  className="text-center py-5 px-4 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-2.5">
                    <Icon className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stat.value}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS SECTION (Clean spacing, 4 steps)                          */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-14 space-y-3">
              <span className="text-xs font-bold tracking-widest text-red-500 uppercase">HOW IT WORKS</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                From incident to resolution in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  minutes
                </span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                RECALL&apos;s autonomous pipeline handles the entire incident lifecycle — detection,
                investigation, recall, and resolution — without manual intervention.
              </p>
            </motion.div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting connector line */}
            <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-red-500/25 via-amber-500/20 to-emerald-500/25 pointer-events-none" />

            {[
              {
                step: '01',
                title: 'Detect',
                desc: 'Anomaly detection engines monitor your telemetry and services 24/7, catching failures before customer impact.',
                icon: Activity,
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/25',
              },
              {
                step: '02',
                title: 'Investigate',
                desc: 'AI agents correlate logs, metrics, traces, and code commits to isolate the exact failing microservice and root cause.',
                icon: Search,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/25',
              },
              {
                step: '03',
                title: 'Recall',
                desc: 'Hindsight memory retrieves relevant past incidents, previous postmortems, and proven solutions with high similarity.',
                icon: Database,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/25',
              },
              {
                step: '04',
                title: 'Resolve',
                desc: 'Execute confidence-backed remediation runbooks automatically, then commit new learnings into institutional memory.',
                icon: CheckCircle2,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10 border-rose-500/25',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.step}>
                  <motion.div
                    custom={i}
                    variants={fadeUp}
                    className="p-6 rounded-2xl bg-[#0b0d14]/85 border border-[#1b2132] hover:border-slate-700 space-y-4 relative group shadow-lg backdrop-blur-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl ${item.bg} border flex items-center justify-center relative z-10 shadow-sm`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                        STEP {item.step}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </motion.div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE CAPABILITIES (3x2 Grid per Image 1)                               */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-14 space-y-3">
              <span className="text-xs font-bold tracking-widest text-red-500 uppercase">CORE CAPABILITIES</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Built for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  modern
                </span>{' '}
                operations teams
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Everything your SRE and DevOps teams need to automate incident triage, memory, and root cause analysis.
              </p>
            </motion.div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Root-Cause Analysis',
                desc: 'Deep learning models pinpoint root cause across distributed clusters by analyzing logs, metrics, traces, and deploy events in seconds.',
                icon: Brain,
                color: 'text-red-400',
                border: 'hover:border-red-500/40',
                bg: 'bg-red-500/10 border-red-500/20',
              },
              {
                title: 'Hindsight Memory Bank',
                desc: 'Every incident resolution is indexed into vector embeddings. When similar alerts fire, RECALL recommends verified solutions instantly.',
                icon: Database,
                color: 'text-emerald-400',
                border: 'hover:border-emerald-500/40',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
              },
              {
                title: 'Automated Runbooks',
                desc: 'Execute deterministic remediation workflows with human-in-the-loop safeguards and rollback mechanisms to restore services fast.',
                icon: Zap,
                color: 'text-amber-400',
                border: 'hover:border-amber-500/40',
                bg: 'bg-amber-500/10 border-amber-500/20',
              },
              {
                title: 'Predictive Monitoring',
                desc: 'Detect subtle degradation patterns before they breach SLA thresholds, giving your team early warnings to prevent outages.',
                icon: Activity,
                color: 'text-red-400',
                border: 'hover:border-red-500/40',
                bg: 'bg-red-500/10 border-red-500/20',
              },
              {
                title: 'Smart Telemetry',
                desc: 'Unified ingestion for OpenTelemetry, Prometheus, Datadog, AWS CloudWatch, and custom application metrics.',
                icon: TrendingUp,
                color: 'text-emerald-400',
                border: 'hover:border-emerald-500/40',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
              },
              {
                title: 'Postmortems & Reports',
                desc: 'Instantly generate comprehensive incident postmortems, executive summaries, timeline graphs, and audit trails.',
                icon: BarChart3,
                color: 'text-indigo-400',
                border: 'hover:border-indigo-500/40',
                bg: 'bg-indigo-500/10 border-indigo-500/20',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <AnimatedSection key={f.title}>
                  <motion.div
                    custom={i}
                    variants={scaleIn}
                    className={`p-6 rounded-2xl bg-[#0b0d14]/80 border border-[#1b2132] ${f.border} space-y-4 group cursor-pointer transition-all duration-300 shadow-lg`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${f.bg} border flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                      {f.desc}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-red-400 transition-colors pt-1">
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CONTINUOUS LEARNING / SMARTER SECTION (Per Image 1)                     */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left: Text Info */}
            <AnimatedSection>
              <motion.div variants={fadeUp} className="space-y-5">
                <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                  CONTINUOUS LEARNING
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Every incident makes RECALL{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    smarter
                  </span>
                </h2>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Traditional observability tools start from scratch every single incident. RECALL indexes every root cause, remediation action, and engineer annotation into an organizational Hindsight Memory Bank.
                </p>
                
                <ul className="space-y-3 pt-2">
                  {[
                    'Predictive recurrence prevention with real-time alerting',
                    'Self-updating post-incident playbooks and automation',
                    'Cross-incident root-cause clustering and topology mapping',
                    'Knowledge graph augmentation powered by team feedback',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Link
                    href="/features"
                    className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                  >
                    <span>Learn how it works</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </AnimatedSection>

            {/* Right: Live Hindsight Memory Stream Console */}
            <AnimatedSection>
              <motion.div variants={scaleIn} className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-emerald-500/10 rounded-3xl blur-2xl" />
                <div className="relative bg-[#0b0d14]/95 border border-[#1e2436] rounded-2xl p-6 sm:p-7 space-y-4 backdrop-blur-xl shadow-2xl">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#1b2132]">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white tracking-wide">Hindsight Memory Recall</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Match Engine
                    </div>
                  </div>

                  {/* Incident Memory Records */}
                  <div className="space-y-2.5">
                    {[
                      {
                        title: 'Database Connection Pool Exhaustion',
                        match: '98.4%',
                        tag: 'PostgreSQL',
                        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        title: 'Microservice Pod CrashLoopBackOff',
                        match: '95.1%',
                        tag: 'Kubernetes',
                        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      },
                      {
                        title: 'Redis Cache Key Eviction Spike',
                        match: '92.7%',
                        tag: 'Redis Cluster',
                        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      },
                      {
                        title: 'Third-Party Auth API Rate Limit',
                        match: '89.3%',
                        tag: 'Auth0 / Gateway',
                        color: 'text-red-400 bg-red-500/10 border-red-500/20',
                      },
                    ].map((row, i) => (
                      <div
                        key={row.title}
                        className="p-3 rounded-xl bg-[#121522]/90 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 font-mono">0{i + 1}</span>
                          <p className="text-xs font-semibold text-slate-200 truncate">{row.title}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 hidden sm:inline">{row.tag}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${row.color}`}>
                            {row.match}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Footer */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1b2132] text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Continuous institutional knowledge indexing active</span>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ENTERPRISE-GRADE SECURITY (Per Image 1)                                */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              className="rounded-3xl bg-[#0b0d14]/90 border border-[#1b2132] p-8 sm:p-12 relative overflow-hidden shadow-2xl"
            >
              {/* Subtle ambient blur */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
                <div className="space-y-4">
                  <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                    ENTERPRISE SECURITY
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Enterprise-grade security by{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                      default
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                    Your infrastructure telemetry and incident data are protected with strict AES-256 encryption at rest, TLS 1.3 in transit, role-based controls, and zero third-party data sharing.
                  </p>
                </div>

                {/* 2x2 Grid Badges */}
                <div className="grid grid-cols-2 gap-3.5">
                  {[
                    { title: 'SOC 2 Type II', desc: 'Certified and audited controls', icon: Shield },
                    { title: 'End-to-End Encryption', desc: 'AES-256 and TLS 1.3 in transit', icon: Lock },
                    { title: 'Role-Based Access', desc: 'Fine-grained RBAC permissions', icon: Server },
                    { title: 'Audit Logging', desc: 'Tamper-proof compliance log', icon: BarChart3 },
                  ].map((sec) => {
                    const Icon = sec.icon;
                    return (
                      <div
                        key={sec.title}
                        className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-[#1b2132] hover:border-red-500/30 transition-all text-center space-y-2 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4 text-red-400" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">{sec.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-tight hidden sm:block">{sec.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. TRUSTED BY / SOCIAL PROOF                                             */}
      {/* ========================================================================= */}
      <section className="relative py-12 px-6 lg:px-12 z-10 border-t border-[#131622]">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-6">
                TRUSTED BY PLATFORM TEAMS WORLDWIDE
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
                {['Microsoft', 'Google', 'AWS', 'GitHub', 'Stripe', 'Notion', 'Vercel'].map((name, i) => (
                  <motion.span
                    key={name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 0.55 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ opacity: 1 }}
                    className="text-slate-400 font-bold text-sm sm:text-base cursor-default transition-opacity"
                  >
                    {name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CTA BANNER (Per Image 1)                                         */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-24 px-6 lg:px-12 z-10">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <motion.div
              variants={scaleIn}
              className="relative rounded-3xl bg-gradient-to-br from-[#10131d] via-[#0b0d14] to-[#10131d] border border-[#22293d] p-10 sm:p-14 text-center overflow-hidden shadow-2xl"
            >
              {/* Radial red glow in CTA background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-red-600/10 rounded-full blur-[110px] pointer-events-none" />

              <div className="relative z-10 space-y-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto shadow-md">
                  <Sparkles className="w-5 h-5 text-red-400" />
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  Ready to transform your <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-red-500">
                    incident response?
                  </span>
                </h2>

                <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                  Join engineering teams that reduce downtime by up to 70% and resolve outages with institutional memory intelligence.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
                  <Link
                    href="/login?mode=signup"
                    className="group px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,31,75,0.4)] hover:shadow-[0_0_35px_rgba(255,31,75,0.55)] transition-all flex items-center gap-2"
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/contact"
                    className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-slate-500 text-slate-200 font-semibold text-xs sm:text-sm transition-all"
                  >
                    Contact Sales
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
