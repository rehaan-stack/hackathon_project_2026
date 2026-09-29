'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Target,
  Eye,
  ShieldCheck,
  Users,
  Rocket,
  Heart,
  Lightbulb,
  Award,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Globe,
  Zap,
} from 'lucide-react';
import { NeuralCoreIcon } from '@/components/icons/NeuralCoreIcon';

/* Animation helpers */
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

export default function AboutPage() {
  /* Dynamic Background Canvas */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

  const pillars = [
    {
      title: 'Our Mission',
      badge: 'PURPOSE',
      description:
        'To eliminate repetitive incident toil by empowering platform and SRE teams with an autonomous AI agent that learns, remembers, and executes remediation — turning outages from recurring crises into solved knowledge.',
      icon: Target,
      color: 'text-red-400',
      border: 'border-red-500/25',
      bg: 'bg-red-500/10',
    },
    {
      title: 'Our Vision',
      badge: 'FUTURE',
      description:
        'A digital world where software systems are genuinely self-healing. Where every resolved incident permanently strengthens the entire infrastructure and organizational expertise is never lost to team turnover.',
      icon: Eye,
      color: 'text-emerald-400',
      border: 'border-emerald-500/25',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Engineered for Trust',
      badge: 'INTEGRITY',
      description:
        'We believe in deterministic automation backed by strict safety bounds. Every remediation action includes human-in-the-loop approvals, audit logs, and dry-run execution with zero guesswork.',
      icon: ShieldCheck,
      color: 'text-amber-400',
      border: 'border-amber-500/25',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Built by SREs for SREs',
      badge: 'COMMUNITY',
      description:
        'Founded by infrastructure veterans who have lived through 3 AM on-call pager storms, postmortem fatigue, and fragmented logs. We build the exact system we wished we had during critical outages.',
      icon: Users,
      color: 'text-indigo-400',
      border: 'border-indigo-500/25',
      bg: 'bg-indigo-500/10',
    },
  ];

  const values = [
    { icon: Lightbulb, title: 'Continuous Intelligence', desc: 'Every incident must leave the infrastructure smarter than before.' },
    { icon: Heart, title: 'Engineer-Centric Design', desc: 'Eliminate alert fatigue and manual toil so developers can innovate.' },
    { icon: Rocket, title: 'Seconds Over Hours', desc: 'MTTR measured in minutes and seconds, never in hours and days.' },
    { icon: Award, title: 'Absolute Determinism', desc: 'AI recommendations backed by verifiable historical evidence.' },
    { icon: Globe, title: 'Cloud-Native Standards', desc: 'Built seamlessly on OpenTelemetry, Kubernetes, and modern cloud stacks.' },
    { icon: Zap, title: 'Proactive Over Reactive', desc: 'Catch anomaly drift early before customer-facing degradation occurs.' },
  ];

  const milestones = [
    {
      year: '2024 Q1',
      title: 'The Inception',
      desc: 'RECALL was conceived after witnessing recurring outages across distributed microservices where the same incident repeated every month without institutional memory.',
    },
    {
      year: '2024 Q3',
      title: 'Hindsight Memory Engine',
      desc: 'Architected the high-dimensional vector memory retrieval system, enabling cosine similarity matching across thousands of historical postmortems in under 1ms.',
    },
    {
      year: '2025 Q1',
      title: 'Autonomous Remediation Pipeline',
      desc: 'Launched deterministic runbook execution with safety canary probes, automated rollbacks, and multi-cloud webhook orchestration.',
    },
    {
      year: '2025 Q4',
      title: 'Enterprise GA & Global Adoption',
      desc: 'General availability release backed by SOC 2 Type II compliance, multi-tenant isolation, and zero-data-leakage architecture.',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#07080c] text-white">
      {/* Particle Background Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />

      {/* Atmospheric Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[650px] h-[650px] bg-red-600/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[45%] right-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH FUTURISTIC COGNITIVE HUB CARD                        */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Mission Narrative */}
          <AnimSection className="lg:col-span-7">
            <motion.div variants={fadeUp} className="space-y-6">
              <motion.div
                variants={fadeUp}
                custom={0}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold tracking-widest uppercase shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ABOUT RECALL INCIDENT INTELLIGENCE</span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.08]"
              >
                Building a <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-red-500">
                  safer, smarter
                </span>{' '}
                digital world.
              </motion.h1>

              <motion.div variants={fadeUp} custom={2} className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                <p>
                  RECALL was born from a fundamental frustration: in modern distributed systems, incidents are constantly re-discovered, re-investigated, and re-learned from scratch.
                </p>
                <p className="text-slate-400">
                  We are a passionate team of SRE veterans, machine learning researchers, and distributed systems engineers building an autonomous cognitive agent that couples deep-learning diagnosis with persistent institutional memory.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/contact"
                  className="group px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,31,75,0.4)] transition-all flex items-center gap-2"
                >
                  <span>Get in Touch</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/features"
                  className="px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-slate-500 text-slate-200 font-semibold text-xs sm:text-sm transition-all"
                >
                  Explore Capabilities
                </Link>
              </motion.div>

              {/* Trust signals */}
              <motion.div variants={fadeUp} custom={4} className="flex flex-wrap items-center gap-5 pt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> SOC 2 Type II Audited
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Zero Third-Party Data Sharing
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> OpenTelemetry Native
                </span>
              </motion.div>
            </motion.div>
          </AnimSection>

          {/* Right Column: Holographic Company Reactor Hub */}
          <AnimSection className="lg:col-span-5">
            <motion.div variants={scaleIn} className="relative">
              {/* Deep Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-rose-500/15 to-emerald-500/10 rounded-3xl blur-3xl opacity-75" />

              <div className="relative rounded-3xl bg-gradient-to-b from-[#0c0f1c]/95 via-[#080a13]/98 to-[#05060b]/98 border border-white/10 p-8 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(255,32,78,0.18)] backdrop-blur-2xl flex flex-col items-center text-center justify-between min-h-[380px] overflow-hidden">
                
                {/* Header status */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                      RECALL SYSTEM v3.4
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    ACTIVE SRE AGENT
                  </span>
                </div>

                {/* Central Futuristic Core Reactor */}
                <div className="relative py-6 flex flex-col items-center justify-center">
                  {/* Concentric rotating tech rings */}
                  <div className="absolute w-[210px] h-[210px] rounded-full border border-red-500/15 border-dashed animate-spin pointer-events-none" style={{ animationDuration: '30s' }} />
                  <div className="absolute w-[150px] h-[150px] bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#ff2a55] via-[#e60a38] to-[#800018] flex items-center justify-center relative shadow-[0_15px_45px_rgba(255,32,82,0.5),inset_0_2px_10px_rgba(255,255,255,0.4)] border border-white/30 group-hover:scale-105 transition-transform duration-300">
                      <NeuralCoreIcon className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 absolute -top-1 -right-1 ring-4 ring-[#0c0f1c] shadow-[0_0_12px_#10b981] animate-pulse" />
                    </div>
                    <div className="w-20 h-4 bg-red-500/30 blur-lg mx-auto rounded-full mt-2" />
                  </motion.div>
                </div>

                {/* Core Motto */}
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-wider">RECALL</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-300 tracking-wide">
                    Better Insights • Faster Actions • Smarter Systems
                  </p>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-white/[0.06] mt-4">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-xs font-black text-white font-mono">99.8%</p>
                    <p className="text-[9px] text-slate-400">Diagnosis</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-xs font-black text-emerald-400 font-mono">4,200+</p>
                    <p className="text-[9px] text-slate-400">Memories</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-xs font-black text-rose-400 font-mono">42s</p>
                    <p className="text-[9px] text-slate-400">Avg MTTR</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimSection>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE 4 PILLARS (Mission, Vision, Trust, Engineering)                    */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((c, i) => {
            const Icon = c.icon;
            return (
              <AnimSection key={c.title}>
                <motion.div
                  custom={i}
                  variants={scaleIn}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl bg-[#0b0d14]/90 border border-[#1b2234] hover:border-red-500/35 flex flex-col justify-between group shadow-xl backdrop-blur-md transition-all h-full"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${c.border} ${c.bg} group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-5 h-5 ${c.color}`} />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/10 text-slate-400">
                        {c.badge}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {c.title}
                    </h3>

                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                </motion.div>
              </AnimSection>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE PRINCIPLES THAT DEFINE RECALL                                     */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 border-y border-[#131622] bg-[#090b12]/60 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimSection>
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                WHAT DRIVES US
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Core principles that define{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  RECALL
                </span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                The technical and cultural ethos that guides how we build autonomous reliability engineering.
              </p>
            </div>
          </AnimSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <AnimSection key={v.title}>
                  <motion.div
                    custom={i}
                    variants={fadeUp}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-[#0b0d14]/80 border border-[#1b2234] hover:border-red-500/25 transition-all group shadow-lg"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                        {v.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{v.desc}</p>
                    </div>
                  </motion.div>
                </AnimSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INNOVATION JOURNEY & MILESTONES                                        */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-24 px-6 sm:px-10 lg:px-14 z-10">
        <div className="max-w-4xl mx-auto">
          <AnimSection>
            <div className="text-center mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                OUR JOURNEY
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">RECALL</span> Evolution
              </h2>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">
                How we transformed from an experimental incident analyzer into a full-scale autonomous SRE agent.
              </p>
            </div>
          </AnimSection>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-6 top-4 bottom-4 w-[2px] bg-gradient-to-b from-red-500/40 via-amber-500/30 to-emerald-500/20" />

            <div className="space-y-6">
              {milestones.map((m, i) => (
                <AnimSection key={m.title}>
                  <motion.div custom={i} variants={fadeUp} className="flex items-start gap-5 relative">
                    <div className="w-12 h-12 rounded-xl bg-[#0f121e] border border-red-500/30 flex items-center justify-center flex-shrink-0 relative z-10 shadow-lg">
                      <span className="text-[10px] font-black text-red-400 font-mono">{m.year}</span>
                    </div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0d14]/90 border border-[#1b2234] hover:border-slate-700 transition-all flex-1 group shadow-lg">
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-red-400 transition-colors">
                        {m.title}
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-400 mt-1.5 leading-relaxed">
                        {m.desc}
                      </p>
                    </div>
                  </motion.div>
                </AnimSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HIGH-IMPACT FINAL CTA                                                  */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 border-t border-[#131622] z-10">
        <div className="max-w-4xl mx-auto">
          <AnimSection>
            <motion.div
              variants={scaleIn}
              className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#121624] via-[#0d1017] to-[#121624] border border-[#232b40] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-2 text-center sm:text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Join the Future of Incident Response
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  Discover how RECALL helps engineering teams turn incidents into permanent organizational intelligence.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
                <Link
                  href="/login?mode=signup"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm shadow-[0_0_25px_rgba(255,31,75,0.45)] transition-all flex items-center gap-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-medium text-xs sm:text-sm transition-all"
                >
                  Contact Us
                </Link>
              </div>
            </motion.div>
          </AnimSection>
        </div>
      </section>
    </div>
  );
}
