'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Incident } from '@/lib/types';
import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { StatusBadge } from '@/components/incidents/StatusBadge';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Brain,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  // Quick preset templates for incident creation
  const [newTitle, setNewTitle] = useState('');
  const [newService, setNewService] = useState('checkout-service');
  const [newSeverity, setNewSeverity] = useState('SEV-2');
  const [newImpact, setNewImpact] = useState('Service degradation affecting customer checkout');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIncidents = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      try {
        const params = new URLSearchParams();
        if (selectedSeverity !== 'all') params.set('severity', selectedSeverity);
        if (selectedStatus !== 'all') params.set('status', selectedStatus);
        if (selectedService !== 'all') params.set('service', selectedService);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        params.set('sort', sortOrder);
        params.set('page', String(currentPage));
        params.set('limit', '10');

        const res = await fetch(`/api/incidents?${params.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.incidents || []);
          if (data.totalPages) setTotalPages(data.totalPages);
          setLastUpdated(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
        }
      } catch (err) {
        console.error('Failed to load incidents:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSeverity, selectedStatus, selectedService, searchQuery, sortOrder, currentPage]
  );

  // Initial and live background auto-polling every 7 seconds
  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => {
      fetchIncidents(true);
    }, 7000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Dynamically extract available unique services
  const availableServices = useMemo(() => {
    const serviceSet = new Set<string>([
      'checkout-service',
      'payment-service',
      'user-service',
      'notification-service',
      'upload-service',
    ]);
    incidents.forEach((i) => {
      if (i.service) serviceSet.add(i.service);
    });
    return Array.from(serviceSet);
  }, [incidents]);

  // Aggregate live metrics for quick chips
  const metrics = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === 'SEV-1').length;
    const investigating = incidents.filter((i) => i.status === 'investigating' || i.status === 'triggered').length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    const memoryAssisted = incidents.filter(
      (i) => i.memoryUsed || (i.memoryIds && i.memoryIds.length > 0)
    ).length;
    return { total, critical, investigating, resolved, memoryAssisted };
  }, [incidents]);

  const handleApplyQuickFilter = (type: 'all' | 'critical' | 'investigating' | 'resolved' | 'memory') => {
    setCurrentPage(1);
    if (type === 'all') {
      setSelectedSeverity('all');
      setSelectedStatus('all');
    } else if (type === 'critical') {
      setSelectedSeverity('SEV-1');
      setSelectedStatus('all');
    } else if (type === 'investigating') {
      setSelectedSeverity('all');
      setSelectedStatus('investigating');
    } else if (type === 'resolved') {
      setSelectedSeverity('all');
      setSelectedStatus('resolved');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const symptomsList = newSymptoms
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          service: newService,
          severity: newSeverity,
          impact: newImpact.trim(),
          status: 'investigating',
          symptoms: symptomsList.length > 0 ? symptomsList : ['Observed latency spike above SLA'],
          logs: [`[WARN] ${newService}: Alert triggered by anomaly detector`],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewSymptoms('');
        await fetchIncidents();
        if (data?.incident?.id) {
          router.push(`/incidents/${data.incident.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (tmpl: {
    title: string;
    service: string;
    severity: string;
    impact: string;
    symptoms: string;
  }) => {
    setNewTitle(tmpl.title);
    setNewService(tmpl.service);
    setNewSeverity(tmpl.severity);
    setNewImpact(tmpl.impact);
    setNewSymptoms(tmpl.symptoms);
  };

  return (
    <div className="mx-auto space-y-6 p-4 animate-in fade-in duration-300 sm:p-6 lg:max-w-[1600px] lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Incidents Management</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitor, investigate, and manage operational incidents connected to Hindsight intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-mono mr-1">
            <span>Synced:</span>
            <span className="text-slate-300">{lastUpdated}</span>
          </div>

          <button
            onClick={() => fetchIncidents()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs font-medium border border-[#1e2433] transition-colors cursor-pointer"
            title="Refresh incidents list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin text-red-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Incident</span>
          </button>
        </div>
      </div>

      {/* Quick Status Metric Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => handleApplyQuickFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSeverity === 'all' && selectedStatus === 'all'
              ? 'bg-[#161c29] border-red-500/40 shadow-sm'
              : 'bg-[#0e111a] border-[#1c2230] hover:border-slate-700'
          }`}
        >
          <p className="text-[11px] text-slate-400 font-medium">All Incidents</p>
          <div className="text-xl font-bold text-white font-mono mt-0.5">{metrics.total}</div>
        </button>

        <button
          onClick={() => handleApplyQuickFilter('critical')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedSeverity === 'SEV-1'
              ? 'bg-rose-950/20 border-rose-500/50 shadow-sm'
              : 'bg-[#0e111a] border-[#1c2230] hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>Critical</span>
            </p>
            {metrics.critical > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">{metrics.critical}</div>
        </button>

        <button
          onClick={() => handleApplyQuickFilter('investigating')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'investigating'
              ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
              : 'bg-[#0e111a] border-[#1c2230] hover:border-amber-500/30'
          }`}
        >
          <p className="text-[11px] text-amber-400 font-medium">Investigating</p>
          <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{metrics.investigating}</div>
        </button>

        <button
          onClick={() => handleApplyQuickFilter('resolved')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === 'resolved'
              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
              : 'bg-[#0e111a] border-[#1c2230] hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </p>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{metrics.resolved}</div>
        </button>

        <div className="p-3 rounded-xl bg-[#0e111a] border border-[#1c2230] text-left">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Brain className="w-3 h-3 text-red-400" />
            <span>Memory Assisted</span>
          </p>
          <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">{metrics.memoryAssisted}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#11141c] border border-[#1c2230] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by title, ID, service, symptoms..."
            className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 text-xs rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-red-500 placeholder-slate-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <div className="flex items-center gap-1.5 bg-[#0a0c10] border border-[#1c2230] rounded-lg px-2.5 py-1">
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="SEV-1">Critical (SEV-1)</option>
              <option value="SEV-2">High (SEV-2)</option>
              <option value="SEV-3">Medium (SEV-3)</option>
              <option value="SEV-4">Low (SEV-4)</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-[#0a0c10] border border-[#1c2230] rounded-lg px-2.5 py-1">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="triggered">Open (Triggered)</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Service - dynamically populated */}
          <div className="flex items-center gap-1.5 bg-[#0a0c10] border border-[#1c2230] rounded-lg px-2.5 py-1">
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Services</option>
              {availableServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortOrder((o) => (o === 'date_desc' ? 'date_asc' : 'date_desc'))}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0a0c10] hover:bg-[#141824] text-slate-300 text-xs border border-[#1c2230] transition-colors cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>{sortOrder === 'date_desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#11141c] border border-[#1c2230] rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1c2230] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#0c0e14]/50">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Title & Service</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Memory Recall</th>
                <th className="py-3.5 px-4 text-right">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181e2b] text-xs">
              {loading && incidents.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-16 bg-[#161d2a] rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-14 bg-[#161d2a] rounded-full" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 w-48 bg-[#161d2a] rounded mb-1" />
                      <div className="h-3 w-24 bg-[#161d2a] rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-20 bg-[#161d2a] rounded-full" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-16 bg-[#161d2a] rounded" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-4 w-28 bg-[#161d2a] rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">No matching incidents found</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Try clearing filters or search query to view active records.
                    </p>
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => router.push(`/incidents/${inc.id}`)}
                    className="hover:bg-[#141824] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-300 group-hover:text-red-400 transition-colors">
                      {inc.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white max-w-sm truncate group-hover:text-red-300 transition-colors">
                        {inc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{inc.service}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {inc.memoryUsed || (inc.memoryIds && inc.memoryIds.length > 0) ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Brain className="w-3 h-3 text-emerald-400" />
                          <span>Recalled</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">No match</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(inc.triggeredAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1c2230] text-xs text-slate-400">
          <span>
            Showing <span className="font-semibold text-white">{incidents.length}</span> incidents
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-[#1c2230] hover:bg-[#141824] text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-white text-xs">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-[#1c2230] hover:bg-[#141824] text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modal: Create Incident */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-[#1c2230] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2230]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-bold text-white">Create New Incident</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Incident Quick Preset Templates */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Incident Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate({
                      title: 'Database connection pool exhaustion in checkout API',
                      service: 'checkout-service',
                      severity: 'SEV-1',
                      impact: 'Checkout confirmations failing with HTTP 504 timeouts',
                      symptoms: 'Connection pool wait > 1200ms\np95 latency spike to 4.8s\nDatabase max connections reached',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#151a27] hover:bg-[#1e2538] border border-[#212b40] text-slate-300 text-[11px] font-medium text-left truncate cursor-pointer transition-colors"
                >
                  ⚡ Checkout DB Exhaustion
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate({
                      title: 'Payment gateway deadlock during inventory reconciliation',
                      service: 'payment-service',
                      severity: 'SEV-2',
                      impact: 'Intermittent failure in credit card charging pipeline',
                      symptoms: 'Deadlock errors in postgres logs\nThread pool starvation\nRetry queue overflowing',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-[#151a27] hover:bg-[#1e2538] border border-[#212b40] text-slate-300 text-[11px] font-medium text-left truncate cursor-pointer transition-colors"
                >
                  💳 Payment Lock Contention
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. High latency in checkout payment confirmation"
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Affected Service</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    {availableServices.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="SEV-1">SEV-1 (Critical)</option>
                    <option value="SEV-2">SEV-2 (High)</option>
                    <option value="SEV-3">SEV-3 (Medium)</option>
                    <option value="SEV-4">SEV-4 (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Impact Summary</label>
                <input
                  type="text"
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  placeholder="e.g. 5% of users seeing checkout timeout"
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Symptoms (One per line)</label>
                <textarea
                  value={newSymptoms}
                  onChange={(e) => setNewSymptoms(e.target.value)}
                  placeholder="HTTP 504 on checkout endpoint&#10;Connection pool queue wait > 800ms"
                  rows={3}
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c2230]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-red-900/30 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
