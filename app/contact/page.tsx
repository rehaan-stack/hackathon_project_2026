'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  HeadphonesIcon,
  Sparkles,
  ArrowRight,
  Shield,
  ChevronDown,
  Copy,
  Check,
  Globe,
  Building,
} from 'lucide-react';

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

export default function ContactPage() {
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

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 850);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const contactMethods = [
    {
      icon: Mail,
      label: 'Direct Email',
      value: 'support@recall.ai',
      desc: 'Response guaranteed under 2 hours',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      icon: Phone,
      label: 'SRE Emergency Line',
      value: '+91 98765 43210',
      desc: 'Mon - Fri, 9:00 AM - 6:00 PM IST',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: MapPin,
      label: 'Headquarters & R&D',
      value: 'Warangal, Telangana, India',
      desc: 'Global Reliability Operations Hub',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  const supportChannels = [
    {
      icon: HeadphonesIcon,
      badge: 'TIER 1 SUPPORT',
      title: 'Technical Support',
      desc: 'Direct access to core SRE and platform engineers for deployment setup, agent configuration, and cluster telemetry integration.',
      cta: 'Open Ticket',
      color: 'text-emerald-400',
    },
    {
      icon: MessageSquare,
      badge: 'ENTERPRISE',
      title: 'Sales & PoC Inquiries',
      desc: 'Schedule a tailored proof-of-concept for your Kubernetes clusters, learn about dedicated VPC deployment, and volume licensing.',
      cta: 'Schedule Call',
      color: 'text-amber-400',
    },
    {
      icon: Clock,
      badge: '24/7 CRITICAL',
      title: 'Emergency Pager Escalation',
      desc: 'Facing an ongoing severe P1 production outage? Enterprise subscribers have instant hotline access to our high-priority on-call response team.',
      cta: 'Incident Hotline',
      color: 'text-rose-400',
    },
  ];

  const faqs = [
    {
      question: 'How quickly can RECALL be connected to our infrastructure?',
      answer:
        'RECALL integrates in less than 5 minutes using our lightweight Helm chart, standard OpenTelemetry collector, or webhook integrations for Datadog, Prometheus, and AWS CloudWatch. Zero code changes required.',
    },
    {
      question: 'Does RECALL store or inspect proprietary application code?',
      answer:
        'No. RECALL adheres to a zero-data-leakage architecture. Only sanitized error traces, metric telemetry, and incident metadata are processed. All data is encrypted with AES-256 at rest and TLS 1.3 in transit, backed by SOC 2 Type II controls.',
    },
    {
      question: 'Can RECALL execute auto-remediations safely without human approval?',
      answer:
        'You have full control. You can configure RECALL to require explicit one-click engineer approval in Slack/PagerDuty before any runbook action executes, or grant autonomous permissions only for verified low-risk self-healing runbooks.',
    },
    {
      question: 'How does the Hindsight Memory Bank improve over time?',
      answer:
        'Every time an incident is resolved — whether by RECALL or by your engineers — the root cause, remediation steps, and postmortem notes are indexed into vector embeddings. Future similar incidents retrieve these proven resolutions with similarity confidence scores.',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-[#07080c] text-white">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />

      {/* Ambient Lighting Glows */}
      <div className="absolute top-0 right-1/4 w-[650px] h-[650px] bg-red-600/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[45%] left-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. HERO HEADER                                                            */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-10 lg:pt-16 lg:pb-14 px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto z-10">
        <AnimSection>
          <motion.div variants={fadeUp} className="max-w-3xl space-y-4">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold tracking-widest uppercase shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>GET IN TOUCH WITH THE RECALL SRE TEAM</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.08]"
            >
              Let&apos;s build a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-red-500">
                safer future
              </span>{' '}
              together.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl"
            >
              Have questions about integrating RECALL into your Kubernetes or cloud infrastructure? Want to see a live demo of the Hindsight Memory Bank? We are here to help.
            </motion.p>
          </motion.div>
        </AnimSection>

        {/* Live response guarantee chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center gap-4 pt-6 text-xs text-slate-300"
        >
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Average Response: &lt; 2 Hours
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            24/7 On-Call Enterprise Coverage
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-slate-300">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            Global R&D Support
          </span>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CONTACT DETAILS + INTERACTIVE GLASSMORPHIC FORM                        */}
      {/* ========================================================================= */}
      <section className="relative pb-20 px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Contact Method Cards */}
            {contactMethods.map((method, i) => {
              const Icon = method.icon;
              return (
                <AnimSection key={method.label}>
                  <motion.div
                    custom={i}
                    variants={fadeUp}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="p-5 rounded-2xl bg-[#0b0d14]/90 border border-[#1b2234] hover:border-red-500/30 flex items-center justify-between gap-4 transition-all shadow-xl backdrop-blur-md group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${method.bg} group-hover:scale-105 transition-transform flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${method.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                          {method.label}
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">{method.value}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{method.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(method.value, i)}
                      className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === i ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </motion.div>
                </AnimSection>
              );
            })}

            {/* Live Headquarters Status Card */}
            <AnimSection>
              <motion.div
                variants={scaleIn}
                className="rounded-2xl bg-gradient-to-br from-[#0e121d] via-[#090b12] to-[#0e121d] border border-[#1f2738] p-6 relative overflow-hidden space-y-4 shadow-xl backdrop-blur-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/8 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] relative z-10">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-white tracking-wide uppercase">RECALL Headquarters</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE OPS
                  </div>
                </div>

                <div className="space-y-1 relative z-10">
                  <p className="text-sm font-semibold text-white">RECALL Cloud Technologies Inc.</p>
                  <p className="text-xs text-slate-400">Warangal, Telangana 506004, India</p>
                </div>

                <div className="pt-2 border-t border-white/[0.06] space-y-2 relative z-10 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Working Hours: <strong className="text-slate-200">Mon - Fri, 9:00 AM - 6:00 PM IST</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Emergency Pager Support: <strong className="text-emerald-400">24/7/365 Active</strong></span>
                  </div>
                </div>
              </motion.div>
            </AnimSection>
          </div>

          {/* Right Column: High-Tech Glassmorphic Contact Form */}
          <div className="lg:col-span-7">
            <AnimSection>
              <motion.div
                variants={scaleIn}
                className="rounded-3xl bg-[#0b0e18]/95 border border-[#1e2538] p-7 sm:p-9 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Transmission Received</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                      Thank you for contacting RECALL. Your inquiry has been routed to our SRE solutions architecture team. An engineer will follow up within 2 hours.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white transition-all"
                      >
                        Send Another Message
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-red-400" />
                        <h3 className="text-sm font-bold text-white tracking-wide uppercase">Send us an inquiry</h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Secure TLS 1.3 Channel</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Alex Mercer"
                          className="w-full bg-[#070910] border border-[#1b2132] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="alex@company.com"
                          className="w-full bg-[#070910] border border-[#1b2132] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                        Inquiry Topic *
                      </label>
                      <select
                        required
                        className="w-full bg-[#070910] border border-[#1b2132] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner cursor-pointer"
                      >
                        <option value="">Select a topic...</option>
                        <option value="demo">Request Custom Interactive Demo</option>
                        <option value="enterprise">Enterprise VPC & Pricing Inquiry</option>
                        <option value="support">Technical Support & Cluster Setup</option>
                        <option value="partnership">Technology & Cloud Partnership</option>
                        <option value="other">General Question</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                        Message Details *
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Tell us about your infrastructure stack, current MTTR challenges, or what you'd like to explore..."
                        className="w-full bg-[#070910] border border-[#1b2132] focus:border-red-500 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner resize-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-[#ff1f4b] to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(255,31,75,0.4)] hover:shadow-[0_0_35px_rgba(255,31,75,0.55)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <span>{loading ? 'Transmitting Message...' : 'Dispatch Message'}</span>
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </form>
                )}
              </motion.div>
            </AnimSection>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MULTIPLE SUPPORT CHANNELS                                              */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 border-y border-[#131622] bg-[#090b12]/60 z-10">
        <div className="max-w-7xl mx-auto">
          <AnimSection>
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
                COMMUNICATION CHANNELS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Dedicated support for every{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  operational tier
                </span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Whether you need deployment troubleshooting, enterprise pricing, or immediate incident escalation.
              </p>
            </div>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {supportChannels.map((channel, i) => {
              const Icon = channel.icon;
              return (
                <AnimSection key={channel.title}>
                  <motion.div
                    custom={i}
                    variants={fadeUp}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="p-6 rounded-2xl bg-[#0b0d14]/90 border border-[#1b2234] hover:border-red-500/35 flex flex-col justify-between group shadow-xl backdrop-blur-md transition-all h-full"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className={`w-5 h-5 ${channel.color}`} />
                        </div>
                        <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/10 text-slate-400">
                          {channel.badge}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                        {channel.title}
                      </h3>

                      <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
                        {channel.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#181d2c] flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-400 group-hover:text-red-300 flex items-center gap-1 transition-colors">
                        {channel.cta} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                </AnimSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE FAQ ACCORDION                                              */}
      {/* ========================================================================= */}
      <section className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-14 z-10">
        <div className="max-w-4xl mx-auto">
          <AnimSection>
            <div className="text-center mb-12 space-y-3">
              <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">know</span>
              </h2>
            </div>
          </AnimSection>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <AnimSection key={faq.question}>
                  <div className="rounded-2xl bg-[#0b0d14]/90 border border-[#1b2234] overflow-hidden transition-colors">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-bold text-white hover:text-red-400 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-400' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </AnimSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FINAL TRIAL CALLOUT                                                    */}
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
                  Ready to test RECALL on your staging cluster?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  Start your 14-day free trial. Setup takes under 5 minutes with our automated Helm installer.
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
