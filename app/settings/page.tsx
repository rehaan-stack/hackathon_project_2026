'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BriefcaseBusiness, Building2, CheckCircle2, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

interface AccountUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name: string;
}

type Notice = { message: string; type: 'success' | 'error' } | null;

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const showNotice = (message: string, type: 'success' | 'error') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Unable to load your account.');
      const data = await res.json();
      const account = data.user as AccountUser;
      setUser(account);
      setFullName(account.full_name);
      setRole(account.role);
      setOrganizationName(account.organization_name);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to load account settings.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const saveAccount = async (payload: Record<string, string>, setSaving: (value: boolean) => void, successMessage: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save settings.');
      const updatedUser = data.user as AccountUser;
      setUser(updatedUser);
      setFullName(updatedUser.full_name);
      setRole(updatedUser.role);
      setOrganizationName(updatedUser.organization_name);
      showNotice(successMessage, 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = (event: React.FormEvent) => {
    event.preventDefault();
    void saveAccount({ full_name: fullName, role }, setSavingProfile, 'Account profile saved.');
  };

  const handleOrganizationSave = (event: React.FormEvent) => {
    event.preventDefault();
    void saveAccount({ organization_name: organizationName }, setSavingOrganization, 'Basic workspace settings saved.');
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotice('New password and confirmation must match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const auth = getFirebaseAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser?.email) throw new Error('Sign in again before changing your password.');
      if (!firebaseUser.providerData.some(({ providerId }) => providerId === 'password')) {
        throw new Error('Your Google account controls your password.');
      }

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await firebaseUser.getIdToken(true) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to refresh your secure session.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showNotice('Password updated. Use it the next time you sign in.', 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Unable to update password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // The server session is cleared below even if Firebase is unavailable.
    }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  return (
    <div className="mx-auto space-y-6 p-4 animate-in fade-in duration-300 sm:p-6 lg:max-w-[1200px] lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Account & Login Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your account profile, workspace basics, and sign-in security.</p>
        </div>
        <button onClick={loadAccount} disabled={loading} className="flex items-center gap-1.5 self-start rounded-xl border border-[#242b3d] bg-[#141824] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1a2030] disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : 'text-slate-400'}`} /> Refresh account
        </button>
      </div>

      {notice && <div className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs ${notice.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
        {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}{notice.message}
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 rounded-2xl border border-[#1c2230] bg-[#11141c] p-6 shadow-xl">
          <SectionTitle icon={<UserRound className="w-5 h-5" />} color="red" title="Account profile" description="Your name and role are visible across operational activity." />
          <form onSubmit={handleProfileSave} className="space-y-4 pt-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" icon={<UserRound className="w-3.5 h-3.5" />}><input value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={loading} required minLength={2} maxLength={100} className={inputClass} /></Field>
              <Field label="Role" icon={<BriefcaseBusiness className="w-3.5 h-3.5" />}><input value={role} onChange={(event) => setRole(event.target.value)} disabled={loading} required minLength={2} maxLength={100} className={inputClass} /></Field>
            </div>
            <Field label="Email address" icon={<Mail className="w-3.5 h-3.5" />}><input value={user?.email || ''} disabled className={`${inputClass} cursor-not-allowed text-slate-500`} /><span className="mt-1 block text-[11px] text-slate-500">Your login email is managed by the account provider.</span></Field>
            <button type="submit" disabled={loading || savingProfile} className={primaryButton}>{savingProfile ? 'Saving profile…' : 'Save profile'}</button>
          </form>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-[#1c2230] bg-[#11141c] p-6 shadow-xl">
          <SectionTitle icon={<Building2 className="w-5 h-5" />} color="blue" title="Basic workspace" description="Keep the shared workspace identity current." />
          <form onSubmit={handleOrganizationSave} className="space-y-4 pt-5 text-xs">
            <Field label="Organization name"><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} disabled={loading} required minLength={2} maxLength={100} className={inputClass} /></Field>
            <p className="rounded-xl border border-[#1c2230] bg-[#0a0c10] p-3 text-[11px] leading-5 text-slate-500">System architecture, providers, and diagnostics are managed outside this account page.</p>
            <button type="submit" disabled={loading || savingOrganization} className={secondaryButton}>{savingOrganization ? 'Saving…' : 'Save basic settings'}</button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 rounded-2xl border border-[#1c2230] bg-[#11141c] p-6 shadow-xl">
          <SectionTitle icon={<KeyRound className="w-5 h-5" />} color="amber" title="Password & sign-in" description="Use a unique password of at least eight characters." />
          <form onSubmit={handlePasswordSave} className="space-y-4 pt-5 text-xs">
            <Field label="Current password"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" className={inputClass} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New password"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} /></Field>
              <Field label="Confirm new password"><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} /></Field>
            </div>
            <button type="submit" disabled={savingPassword} className={primaryButton}>{savingPassword ? 'Updating password…' : 'Update password'}</button>
          </form>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-[#1c2230] bg-[#11141c] p-6 shadow-xl">
          <SectionTitle icon={<ShieldCheck className="w-5 h-5" />} color="green" title="Current session" description="You are signed in on this device." />
          <div className="space-y-3 pt-5 text-xs">
            <div className="rounded-xl border border-[#1c2230] bg-[#0a0c10] p-3.5"><p className="font-medium text-slate-200">Secure session active</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Your session is stored in an HttpOnly cookie and expires automatically after seven days.</p></div>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"><LogOut className="w-3.5 h-3.5" /> Sign out of this device</button>
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-[#1c2230] bg-[#0a0c10] px-3 py-2.5 text-slate-200 outline-none focus:border-red-500 disabled:opacity-50';
const primaryButton = 'rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-red-500 disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-[#30394e] bg-[#141824] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#1a2030] disabled:opacity-50';

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-300">{icon && <span className="text-slate-500">{icon}</span>}{label}</span>{children}</label>;
}

function SectionTitle({ icon, color, title, description }: { icon: React.ReactNode; color: 'red' | 'blue' | 'amber' | 'green'; title: string; description: string }) {
  const colors = { red: 'bg-red-500/15 border-red-500/25 text-red-400', blue: 'bg-blue-500/15 border-blue-500/25 text-blue-400', amber: 'bg-amber-500/15 border-amber-500/25 text-amber-400', green: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' };
  return <div className="flex items-center gap-3 pb-5 border-b border-[#1c2230]"><div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colors[color]}`}>{icon}</div><div><h2 className="text-sm font-bold text-white">{title}</h2><p className="text-xs text-slate-400">{description}</p></div></div>;
}
