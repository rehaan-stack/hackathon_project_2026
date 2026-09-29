'use client';

import React, { useState } from 'react';
import { Incident, ResolutionOutcome, ResolutionForm, RetentionResult } from '@/lib/types';
import { Brain, CheckCircle2, AlertCircle, X, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (updatedIncident: Incident) => void;
}

export function ResolutionModal({ incident, isOpen, onClose, onResolved }: Props) {
  const [outcome, setOutcome] = useState<ResolutionOutcome>('successful');
  const [rootCause, setRootCause] = useState<string>(incident.rootCause || '');
  const [actionTaken, setActionTaken] = useState<string>(incident.resolution || '');
  const [result, setResult] = useState<string>('Telemetry recovered to normal thresholds. p95 latency restored under 300ms.');
  const [resolutionTimeMinutes, setResolutionTimeMinutes] = useState<number>(45);
  const [additionalLesson, setAdditionalLesson] = useState<string>(
    incident.lessonsLearned || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [retention, setRetention] = useState<RetentionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: ResolutionForm = {
      incidentId: incident.id,
      outcome,
      rootCause,
      actionTaken,
      result,
      resolutionTimeMinutes: Number(resolutionTimeMinutes),
      additionalLesson,
    };

    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit resolution');
      }

      const data = await res.json();
      setRetention(data.retention || null);
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        onResolved(data.incident);
        onClose();
      }, 1600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving experience';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#0e1526] border border-slate-700/80 shadow-2xl p-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {retention?.success
                  ? retention.mode === 'hindsight'
                    ? 'Experience Retained in Live Hindsight'
                    : 'Experience Saved to Development Fallback'
                  : 'Incident Resolved; Memory Retention Failed'}
              </h3>
              <p className="text-xs text-indigo-300 font-mono mt-1">
                {retention?.message || 'Retention status was not returned.'}
              </p>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                {retention?.success
                  ? 'Future incidents can use this retained experience according to the provider shown above.'
                  : 'The incident was closed, but no memory provider confirmed retention.'}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Brain className="w-4 h-4" />
                <span>Complete Incident & Retain in Memory</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Resolve {incident.id}: {incident.title}
              </h2>
              <p className="text-xs text-slate-400">
                Capture the definitive outcome so the AI agent remembers how to handle this next time.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resolution Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Resolution Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['successful', 'partial', 'failed'] as ResolutionOutcome[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOutcome(st)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all capitalize ${
                      outcome === st
                        ? st === 'successful'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                          : st === 'partial'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                          : 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {st === 'successful' ? '✓ Successful' : st === 'partial' ? '⚡ Partial' : '✕ Failed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Root Cause */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmed Root Cause
              </label>
              <textarea
                required
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="What fundamentally caused this incident?"
                className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Action Taken */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Remediation Action Taken
              </label>
              <textarea
                required
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Detailed actions executed to mitigate the issue..."
                className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Result & Time */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Verification Result
                </label>
                <input
                  type="text"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Time (min)
                </label>
                <input
                  type="number"
                  min={1}
                  value={resolutionTimeMinutes}
                  onChange={(e) => setResolutionTimeMinutes(Number(e.target.value))}
                  className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Lessons Learned */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Organizational Lesson (for future AI recall)
              </label>
              <textarea
                rows={2}
                value={additionalLesson}
                onChange={(e) => setAdditionalLesson(e.target.value)}
                placeholder="What should the AI remember to advise the next team that encounters this pattern?"
                className="w-full text-xs rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Retaining in Hindsight...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>SAVE EXPERIENCE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
