'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from 'firebase/auth';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Brain,
  Database,
  Zap,
  Lock,
} from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { RecallLogo } from '@/components/icons/RecallLogo';

type LoadingAction = 'credentials' | 'google' | null;

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : '';

  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Please log in.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/weak-password': 'Choose a password with at least six characters.',
  };

  if (messages[code]) return messages[code];
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const syncServerSession = async (idToken: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Unable to start a secure session.');
  };

  useEffect(() => {
    const completeMobileGoogleRedirect = async () => {
      try {
        const result = await getRedirectResult(getFirebaseAuth());
        if (!result) return;

        setLoadingAction('google');
        await syncServerSession(await result.user.getIdToken(true));
        router.replace(redirectUrl);
        router.refresh();
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setLoadingAction(null);
      }
    };

    void completeMobileGoogleRedirect();
  }, [redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('credentials');
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const result = mode === 'signup'
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);

      if (mode === 'signup' && fullName.trim()) {
        await updateProfile(result.user, { displayName: fullName.trim() });
      }

      await syncServerSession(await result.user.getIdToken(true));
      router.replace(redirectUrl);
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingAction('google');
    setError(null);
    let handingOffToGoogle = false;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const auth = getFirebaseAuth();

      if (window.matchMedia('(max-width: 767px)').matches) {
        handingOffToGoogle = true;
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      await syncServerSession(await result.user.getIdToken(true));
      router.replace(redirectUrl);
      router.refresh();
    } catch (err) {
      handingOffToGoogle = false;
      setError(getAuthErrorMessage(err));
    } finally {
      if (!handingOffToGoogle) setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <AnimatePresence>
        {loadingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#07080d]/95 p-5 sm:p-6 md:backdrop-blur-xl"
            role="status"
            aria-live="polite"
            aria-label={loadingAction === 'google' ? 'Connecting to Google' : 'Authenticating'}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative flex w-full max-w-xs flex-col items-center overflow-hidden rounded-3xl border border-red-500/30 bg-[#10121b] px-7 py-8 text-center shadow-[0_18px_48px_rgba(220,38,38,0.22)] sm:px-8 sm:py-9 sm:shadow-[0_24px_80px_rgba(220,38,38,0.28)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(239,68,68,0.22),transparent_48%)]" />
              <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-red-500/25" />
                <span className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-400 border-r-rose-500 md:animate-spin" />
                <RecallLogo className="h-16 w-16" priority />
              </div>
              <p className="relative text-sm font-bold tracking-wide text-white">
                {loadingAction === 'google' ? 'Connecting to Google' : 'Authenticating securely'}
              </p>
              <p className="relative mt-2 text-xs leading-relaxed text-slate-400">
                {loadingAction === 'google'
                  ? 'Opening your secure Google sign-in…'
                  : 'Verifying your RECALL workspace…'}
              </p>
              <div className="relative mt-5 hidden h-1 w-40 overflow-hidden rounded-full bg-red-950/70 sm:block">
                <motion.span
                  animate={{ x: ['-110%', '210%'] }}
                  transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
                  className="block h-full w-1/2 rounded-full bg-gradient-to-r from-red-500 via-rose-400 to-red-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 dot-pattern opacity-10 pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 relative z-10">
        
        {/* Left Panel — Brand & Features (Desktop only) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col justify-center p-10 lg:p-12 rounded-l-2xl bg-gradient-to-br from-[#0d1017] via-[#0e1118] to-[#0d1017] border border-[#1c2230] border-r-0 relative overflow-hidden"
        >
          <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
          <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-8">
            {/* Brand */}
            <div className="space-y-4">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-16 w-16 items-center justify-center"
              >
                <RecallLogo className="h-16 w-16" priority />
              </motion.div>
              <h2 className="text-3xl font-black text-white tracking-tight">Welcome to RECALL</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                The AI-powered incident response platform that learns from every resolution 
                and makes your team smarter over time.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              {[
                { icon: Brain, label: 'AI-Powered Investigation', desc: 'Root cause analysis in seconds' },
                { icon: Database, label: 'Memory Intelligence', desc: 'Learns from every incident' },
                { icon: Zap, label: 'Auto-Resolution', desc: 'Confidence-backed fixes' },
                { icon: Lock, label: 'Enterprise Security', desc: 'SOC2 compliant, E2E encrypted' },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={feat.label}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{feat.label}</p>
                      <p className="text-[11px] text-slate-400">{feat.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Trust Signal */}
            <div className="flex items-center gap-4 pt-4 border-t border-[#1c2230]">
              <div className="flex -space-x-2">
                {['bg-red-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500'].map((color, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-[#0d1017] flex items-center justify-center text-[8px] font-bold text-white`}>
                    {['MR', 'AK', 'DP', 'SK'][i]}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Trusted by <span className="text-white font-semibold">500+</span> engineering teams worldwide
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Panel — Login Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-[#11141c] border border-[#1c2230] rounded-2xl lg:rounded-l-none lg:rounded-r-2xl p-7 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="lg:hidden mx-auto flex h-14 w-14 items-center justify-center">
              <RecallLogo className="h-14 w-14" priority />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5">
                {mode === 'login'
                  ? 'Sign in to your account to continue to RECALL'
                  : 'Join RECALL to experience memory-driven incident response'}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mirza Rehaan"
                  className="w-full bg-[#0c0e14] border border-[#1f2738] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0c0e14] border border-[#1f2738] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0c0e14] border border-[#1f2738] focus:border-red-500 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-end text-xs">
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loadingAction !== null}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 btn-glow-red"
            >
              <span className="relative z-10">{loadingAction === 'credentials' ? 'Authenticating...' : mode === 'login' ? 'Log In' : 'Sign Up'}</span>
              <ArrowRight className="w-4 h-4 relative z-10" />
            </motion.button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-[#1c2230]" />
            <span className="bg-[#11141c] px-3 text-[11px] text-slate-500 uppercase tracking-wider">or</span>
          </div>

          {/* Google sign-in */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingAction !== null}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-[#1f2738] hover:border-slate-600 text-sm font-medium text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.23-.2-1.77H12v3.43h5.37c-.11.85-.73 2.13-2.11 2.99l-.02.11 3.06 2.37.21.02c1.94-1.79 2.84-4.42 2.84-7.15Z" />
              <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.86 6.46-2.35l-3.08-2.39c-.82.57-1.92.97-3.38.97-2.58 0-4.77-1.71-5.55-4.07l-.1.01-3.18 2.46-.03.1A9.76 9.76 0 0 0 12 21.75Z" />
              <path fill="#FBBC05" d="M6.45 13.91A5.92 5.92 0 0 1 6.14 12c0-.67.12-1.31.3-1.91v-.12L3.23 7.48l-.1.05A9.74 9.74 0 0 0 2.25 12c0 1.61.39 3.13.88 4.47l3.32-2.56Z" />
              <path fill="#EA4335" d="M12 6.02c1.84 0 3.09.79 3.8 1.45l2.78-2.71C16.83 3.15 14.63 2.25 12 2.25a9.76 9.76 0 0 0-8.87 5.28l3.31 2.56C7.23 7.73 9.42 6.02 12 6.02Z" />
            </svg>
            <span>{loadingAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </motion.button>

          {/* Toggle Mode */}
          <div className="text-center text-xs text-slate-400 pt-1">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/signup')}
                  className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  Log in
                </button>
              </>
            )}
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> 256-bit SSL</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500/50" /> SOC2 Certified</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
