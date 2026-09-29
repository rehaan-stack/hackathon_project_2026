'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { RecallLogo } from '@/components/icons/RecallLogo';

function getErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/user-not-found') return 'There is no account with that email address.';
  return error instanceof Error ? error.message : 'Unable to send a password reset email.';
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setMessage('Check your inbox for a Firebase password-reset email.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-[#08090d] px-4 py-12 flex items-center justify-center">
    <div className="w-full max-w-md rounded-2xl border border-[#1c2230] bg-[#11141c] p-7 sm:p-8 shadow-2xl">
      <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center"><RecallLogo className="h-14 w-14" priority /></div><h1 className="text-xl font-black text-white">Reset your password</h1><p className="mt-2 text-xs leading-5 text-slate-400">Enter your account email and Firebase will send a secure password-reset link.</p></div>
      {error && <p className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {message && <p className="mb-4 flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />{message}</p>}
      {!message && <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-300">Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-xl border border-[#1f2738] bg-[#0c0e14] px-4 py-3 text-sm text-white outline-none focus:border-red-500" /></label>
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}{loading ? 'Sending reset email...' : 'Send reset email'}</button>
      </form>}
      <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"><ArrowLeft className="w-3.5 h-3.5" />Back to login</Link>
    </div>
  </main>;
}
