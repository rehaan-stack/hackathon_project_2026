'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingDown,
  Brain,
} from 'lucide-react';

interface TrendItem {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface ServiceStat {
  service: string;
  total: number;
  resolved: number;
  critical: number;
  resolutionRate: number;
}

interface SeverityBreakdown {
  severity: string;
  avgMinutes: number;
  count: number;
}

interface PatternItem {
  service: string;
  pattern: string;
  occurrences: number;
  preventedByMemory: boolean;
}

const trendSeries = [
  { key: 'critical', label: 'Critical', color: '#ef4444' },
  { key: 'high', label: 'High', color: '#f97316' },
  { key: 'medium', label: 'Medium', color: '#eab308' },
  { key: 'low', label: 'Low', color: '#10b981' },
] as const;

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalIncidents: 0,
    meanTimeToDetect: '12m',
    meanTimeToResolve: '38m',
    resolutionRate: '83%',
    aiAssistedInvestigations: 0,
    memoryAssistedInvestigations: 0,
    recurringPatterns: 0,
  });

  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [services, setServices] = useState<ServiceStat[]>([]);
  const [resolutionBreakdown, setResolutionBreakdown] = useState<SeverityBreakdown[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    let receivedData = false;
    try {
      // 1. Summary
      const sumRes = await fetch('/api/analytics/summary');
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData?.summary) {
          setSummary(sumData.summary);
          receivedData = true;
        }
      }

      // 2. Trends
      const trendRes = await fetch(`/api/analytics/incidents?timeRange=${timeRange}`);
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        if (Array.isArray(trendData?.trends)) {
          setTrends(trendData.trends);
          receivedData = true;
        }
      }

      // 3. Services
      const srvRes = await fetch('/api/analytics/services');
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (Array.isArray(srvData?.services)) {
          setServices(srvData.services);
          receivedData = true;
        }
      }

      // 4. Resolution time
      const resTimeRes = await fetch('/api/analytics/resolution-time');
      if (resTimeRes.ok) {
        const resTimeData = await resTimeRes.json();
        if (Array.isArray(resTimeData?.severityBreakdown)) {
          setResolutionBreakdown(resTimeData.severityBreakdown);
          receivedData = true;
        }
      }

      // 5. Patterns
      const patRes = await fetch('/api/analytics/patterns');
      if (patRes.ok) {
        const patData = await patRes.json();
        if (Array.isArray(patData?.patterns)) {
          setPatterns(patData.patterns);
          receivedData = true;
        }
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      if (receivedData) setLastUpdated(new Date());
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalyticsData();
    const refreshInterval = window.setInterval(fetchAnalyticsData, 30_000);
    return () => window.clearInterval(refreshInterval);
  }, [fetchAnalyticsData]);

  // Max value for trends to scale SVG
  const maxTrendTotal = Math.max(1, ...trends.map((t) => t.total || 0));
  const maxServiceTotal = Math.max(1, ...services.map((s) => s.total || 0));

  const chartWidth = 400;
  const chartHeight = 160;
  const chartPadding = 8;
  const chartPlotHeight = chartHeight - chartPadding * 2;
  const barSlotWidth = chartWidth / Math.max(1, trends.length);
  const barWidth = Math.min(36, Math.max(5, barSlotWidth * 0.58));

  return (
    <div className="mx-auto space-y-6 p-4 animate-in fade-in duration-300 sm:p-6 lg:max-w-[1600px] lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Analytics & MTTR Insights</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real backend aggregated metrics, incident volumes, resolution trends, and learning loop effectiveness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-[#11141c] border border-[#1c2230] text-slate-300 text-xs rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:border-red-500 cursor-pointer appearance-none flex items-center gap-2"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => fetchAnalyticsData()}
            className="p-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-300 hover:text-white border border-[#1e2433] transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <div className="p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-2 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Total Incidents</span>
          <div className="text-2xl font-bold text-white font-mono">{summary.totalIncidents}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-red-400 font-medium">{summary.aiAssistedInvestigations}</span> AI investigations run
          </div>
        </div>

        {/* MTTD */}
        <div className="p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-2 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Mean Time to Detect (MTTD)</span>
          <div className="text-2xl font-bold text-white font-mono">{summary.meanTimeToDetect}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>Autonomous anomaly detection</span>
          </div>
        </div>

        {/* MTTR */}
        <div className="p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-2 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Mean Time to Resolve (MTTR)</span>
          <div className="text-2xl font-bold text-white font-mono">{summary.meanTimeToResolve}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Calculated from verified resolutions</span>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="p-4 rounded-xl bg-[#11141c] border border-[#1c2230] space-y-2 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Resolution Rate</span>
          <div className="text-2xl font-bold text-white font-mono">{summary.resolutionRate}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{summary.memoryAssistedInvestigations} assisted by memory</span>
          </div>
        </div>
      </div>

      {/* Split Grid: Incident Trend & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic Incident Trend (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Incident Volume Trend</h2>
              <p className="text-[11px] text-slate-400">Daily severity mix over {timeRange}</p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
              {trendSeries.map((series) => (
                <span key={series.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: series.color }} />
                  {series.label}
                </span>
              ))}
              <span className="text-emerald-400/90 font-medium" aria-live="polite">
                {lastUpdated ? 'Live · synced' : 'Syncing…'}
              </span>
            </div>
          </div>

          {/* Stacked bars generated from the live incident trend endpoint */}
          <div className="space-y-4 pt-2">
            <div className="relative h-56 w-full">
              {/* Y Axis Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-mono text-slate-500 pointer-events-none">
                <div className="border-b border-[#1c2230]/60 pb-1">{maxTrendTotal}</div>
                <div className="border-b border-[#1c2230]/60 pb-1">{Math.round(maxTrendTotal * 0.75)}</div>
                <div className="border-b border-[#1c2230]/60 pb-1">{Math.round(maxTrendTotal * 0.5)}</div>
                <div className="border-b border-[#1c2230]/60 pb-1">{Math.round(maxTrendTotal * 0.25)}</div>
                <div className="border-b border-[#1c2230]/60 pb-1">0</div>
              </div>

              {/* Each bar contains the live count for every severity on that day. */}
              <svg className="absolute inset-0 w-full h-full pl-6 overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 160">
                {trends.map((trend, index) => {
                  let stackedTotal = 0;
                  const x = index * barSlotWidth + (barSlotWidth - barWidth) / 2;

                  return trendSeries.map((series) => {
                    const value = trend[series.key];
                    const segmentHeight = (value / maxTrendTotal) * chartPlotHeight;
                    const y = chartPadding + chartPlotHeight - ((stackedTotal + value) / maxTrendTotal) * chartPlotHeight;
                    stackedTotal += value;

                    return (
                      <rect
                        key={series.key}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={segmentHeight}
                        fill={series.color}
                        opacity={value > 0 ? 0.92 : 0}
                        rx="1.5"
                      >
                        <title>{`${trend.date}: ${series.label} ${value}`}</title>
                      </rect>
                    );
                  });
                })}
              </svg>
            </div>

            {/* Dynamic X Axis labels */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pl-6">
              {trends.map((t, idx) => {
                if (trends.length > 7 && idx % Math.ceil(trends.length / 7) !== 0) return null;
                return <span key={idx}>{t.date}</span>;
              })}
            </div>
          </div>
        </div>

        {/* Right: Top Services by Incidents (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 space-y-5 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-white">Top Services by Incidents</h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Service breakdown from database records
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {services.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No services recorded.</p>
            ) : (
              services.map((srv, idx) => {
                const widthPct = Math.max(10, Math.round((srv.total / maxServiceTotal) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-medium">{srv.service}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 text-[11px]">{srv.resolutionRate}% resolved</span>
                        <span className="text-slate-400 font-bold">{srv.total}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#181d2a] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          srv.critical > 0 ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Resolution Time by Severity + Recurring Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Resolution Time */}
        <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Mean Resolution Time by Severity</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {resolutionBreakdown.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#141824] border border-[#1c2230] space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {item.severity}
                </span>
                <div className="text-xl font-bold text-white font-mono">
                  {item.avgMinutes}m
                </div>
                <p className="text-[11px] text-slate-500">{item.count} total incidents</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recurring Patterns Identified */}
        <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white">Recurring Failure Patterns</h2>
          </div>

          <div className="space-y-3 pt-2">
            {patterns.length === 0 ? (
              <p className="text-xs text-slate-500">No recurring patterns detected across services.</p>
            ) : (
              patterns.map((pat, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#141824] border border-[#1c2230] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-200">{pat.service}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {pat.occurrences} recurrences
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{pat.pattern}</p>
                  <p className="text-[10px] text-emerald-400">
                    {pat.preventedByMemory ? '✓ Memory assistance active' : 'Awaiting retention in Hindsight'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
