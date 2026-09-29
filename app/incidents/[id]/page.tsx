'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { StatusBadge } from '@/components/incidents/StatusBadge';
import { Incident, RecalledMemory } from '@/lib/types';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  Clock,
  Server,
  Brain,
  History,
  Terminal,
  Activity,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  incident_id: string;
  event_type: string;
  message: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function IncidentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [relatedMemories, setRelatedMemories] = useState<RecalledMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Event Modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventMessage, setEventMessage] = useState('');
  const [eventType, setEventType] = useState('EVENT_ADDED');

  // Resolve Modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState<'successful' | 'partial' | 'failed'>('successful');
  const [resolutionMinutes, setResolutionMinutes] = useState(30);
  const [lessonsLearned, setLessonsLearned] = useState('');

  const loadIncidentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Incident ${id} not found.`);
        throw new Error('Failed to load incident details.');
      }
      const data = await res.json();
      setIncident(data.incident);
      setTimeline(data.timeline || []);
      setRelatedMemories(data.relatedMemories || []);
      if (data.incident?.rootCause) setRootCause(data.incident.rootCause);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading incident');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Action: Mark Investigating
  const handleMarkInvestigating = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'investigating' }),
      });
      if (res.ok) {
        await loadIncidentData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reopen Incident
  const handleReopenIncident = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'triggered', rootCause: '' }),
      });
      if (res.ok) {
        await loadIncidentData();
      }
    } catch (err) {
      console.error('Failed to reopen incident:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Add Event
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventMessage.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          message: eventMessage.trim(),
        }),
      });
      if (res.ok) {
        setIsAddEventOpen(false);
        setEventMessage('');
        await loadIncidentData();
      }
    } catch (err) {
      console.error('Failed to add event:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Resolve & Retain
  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !actionTaken.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: id,
          rootCause: rootCause.trim(),
          actionTaken: actionTaken.trim(),
          outcome: resolutionOutcome,
          resolutionTimeMinutes: Number(resolutionMinutes) || 30,
          additionalLesson: lessonsLearned.trim() || 'Recorded during resolution.',
          result: `Incident ${id} successfully mitigated and closed.`,
        }),
      });
      if (res.ok) {
        setIsResolveModalOpen(false);
        await loadIncidentData();
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Start Investigation
  const handleStartInvestigation = () => {
    router.push(`/investigation?id=${id}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 text-center sm:p-8">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading incident {id} details from database...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 text-center sm:p-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Incident Not Found</h2>
        <p className="text-slate-400 text-sm">{error || `Incident ${id} could not be retrieved.`}</p>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </Link>
      </div>
    );
  }

  const isResolved = incident.status === 'resolved';

  return (
    <div className="mx-auto space-y-6 p-4 animate-in fade-in duration-300 sm:p-6 lg:max-w-[1500px] lg:p-8">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c2230]">
        <div className="flex items-center gap-3">
          <Link
            href="/incidents"
            className="p-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-400 hover:text-white border border-[#242b3d] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-red-400">{incident.id}</span>
              <SeverityBadge severity={incident.severity} showDot />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-1">{incident.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-300 hover:text-white text-xs font-medium border border-[#242b3d] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>

          {!isResolved && (
            <button
              onClick={handleStartInvestigation}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Start Investigation</span>
            </button>
          )}

          {!isResolved && incident.status !== 'investigating' && (
            <button
              onClick={handleMarkInvestigating}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mark Investigating</span>
            </button>
          )}

          {!isResolved ? (
            <button
              onClick={() => setIsResolveModalOpen(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resolve Incident</span>
            </button>
          ) : (
            <button
              onClick={handleReopenIncident}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reopen Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Overview & Metadata (Left) + Timeline & Memory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-red-400" />
              <span>Incident Metadata</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Service</span>
                <p className="font-mono text-white font-medium mt-0.5">{incident.service}</p>
              </div>
              <div>
                <span className="text-slate-500">Detected At</span>
                <p className="text-slate-300 mt-0.5">
                  {new Date(incident.triggeredAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Impact</span>
                <p className="text-slate-300 mt-0.5">
                  {incident.impact || (incident.severity === 'SEV-1' ? 'High Customer Impact' : 'Internal Degradation')}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Resolved At</span>
                <p className="text-slate-300 mt-0.5">
                  {incident.resolvedAt
                    ? new Date(incident.resolvedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Unresolved'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Memory Recalled</span>
                <p className="text-slate-300 mt-0.5 font-medium">
                  {incident.memoryUsed ? (
                    <span className="text-emerald-400">Yes (Hindsight active)</span>
                  ) : (
                    <span className="text-slate-400">None yet</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Created By</span>
                <p className="text-slate-300 mt-0.5">{incident.createdBy || 'System Agent'}</p>
              </div>
            </div>

            {incident.description && (
              <div className="pt-3 border-t border-[#1c2230]">
                <span className="text-xs text-slate-500">Description</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{incident.description}</p>
              </div>
            )}
          </div>

          {/* Root Cause & Resolution Card */}
          <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Root Cause & Resolution</span>
            </h3>

            {incident.rootCause ? (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Confirmed Root Cause
                </span>
                <p className="text-xs text-slate-200">{incident.rootCause}</p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#141824] border border-[#1e2433] text-xs text-slate-400">
                Root cause not yet confirmed. Run an AI investigation to inspect symptoms.
              </div>
            )}
          </div>

          {/* Symptoms & Telemetry */}
          <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Detected Symptoms</span>
            </h3>

            {incident.symptoms && incident.symptoms.length > 0 ? (
              <ul className="space-y-1.5">
                {incident.symptoms.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No specific symptoms recorded.</p>
            )}

            {/* Logs Snippet */}
            {incident.logs && incident.logs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#1c2230] space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Associated Logs</span>
                </span>
                <div className="bg-[#0a0c10] border border-[#1a1e2b] rounded-lg p-3 font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto max-h-48">
                  {incident.logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Related Hindsight Memories (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Incident Timeline */}
          <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Incident Timeline & Events</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">{timeline.length} events</span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e2433]">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500">No events recorded in timeline yet.</p>
              ) : (
                timeline.map((ev) => (
                  <div key={ev.id} className="relative group">
                    <span
                      className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#11141c] ${
                        ev.event_type.includes('RESOLVED') || ev.event_type.includes('VERIFIED')
                          ? 'bg-emerald-400'
                          : ev.event_type.includes('INVESTIGATION') || ev.event_type.includes('MEMORY')
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-200">
                        {ev.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{ev.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Related Hindsight Memories Card */}
          <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-red-400" />
              <span>Related Hindsight Experience</span>
            </h3>

            {relatedMemories.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-[#141824] border border-[#1e2433] text-xs text-slate-400">
                No past experiences matched for this incident query yet.
              </div>
            ) : (
              <div className="space-y-3">
                {relatedMemories.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#0e1118] border border-[#1c2230] space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-red-400 font-semibold">
                        {item.memory.incidentId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {item.relevanceLabel || `${Math.round(item.relevance * 100)}% match`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">{item.memory.title}</p>
                    {item.memory.rootCause && (
                      <p className="text-[11px] text-slate-400">
                        <span className="text-slate-500">Root Cause:</span> {item.memory.rootCause}
                      </p>
                    )}
                    {item.memory.successfulActions && item.memory.successfulActions.length > 0 && (
                      <p className="text-[11px] text-emerald-400">
                        <span className="text-slate-500">Proven Action:</span> {item.memory.successfulActions[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Event */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-[#1c2230] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-white">Add Incident Event</h2>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="EVENT_ADDED">Operational Note (EVENT_ADDED)</option>
                  <option value="INVESTIGATION_STARTED">Investigation Step (INVESTIGATION_STARTED)</option>
                  <option value="ACTION_EXECUTED">Action Executed (ACTION_EXECUTED)</option>
                  <option value="ROOT_CAUSE_IDENTIFIED">Root Cause Identified</option>
                  <option value="RESOLUTION_VERIFIED">Resolution Verified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Message</label>
                <textarea
                  value={eventMessage}
                  onChange={(e) => setEventMessage(e.target.value)}
                  placeholder="Describe the action or finding..."
                  rows={3}
                  required
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  {actionLoading ? 'Saving...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Incident */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-[#1c2230] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Resolve & Retain Into Hindsight</h2>
            </div>
            <p className="text-xs text-slate-400">
              Closing this incident will verify the resolution and automatically retain the experience into
              Hindsight organizational memory for future recurrence prevention.
            </p>

            <form onSubmit={handleResolveIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Root Cause</label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="e.g. Postgres pool saturated by slow unindexed query"
                  required
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Action Taken (Resolution)</label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Increased pool ceiling to 40, added statement timeout of 3000ms"
                  required
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resolution Outcome</label>
                  <select
                    value={resolutionOutcome}
                    onChange={(e) => setResolutionOutcome(e.target.value as 'successful' | 'partial' | 'failed')}
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="successful">Successful (Mitigated)</option>
                    <option value="partial">Partial</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Time to Resolve (Minutes)</label>
                  <input
                    type="number"
                    value={resolutionMinutes}
                    onChange={(e) => setResolutionMinutes(parseInt(e.target.value, 10) || 30)}
                    min={1}
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Learned</label>
                <textarea
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="What should the team or AI remember next time this service spikes?"
                  rows={2}
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                >
                  {actionLoading ? 'Retaining...' : 'Verify & Retain Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
