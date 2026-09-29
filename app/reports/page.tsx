'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DBReportRecord } from '@/lib/db';
import {
  FileText,
  Plus,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  Eye,
  Search,
  Copy,
  Check,
  ArrowDownUp,
} from 'lucide-react';

const reportTypeLabels: Record<DBReportRecord['report_type'], string> = {
  incident: 'Incident Postmortem',
  weekly_summary: 'Weekly Summary',
  system_health: 'System Health Audit',
  incident_analysis: 'Incident Analysis',
  performance: 'Performance Report',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<DBReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'incident' | 'weekly_summary' | 'system_health' | 'incident_analysis' | 'performance'
  >('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedReport, setSelectedReport] = useState<DBReportRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Generate Report Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportType, setNewReportType] = useState<DBReportRecord['report_type']>('incident');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === 'all' ? '/api/reports' : `/api/reports?type=${activeTab}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDownload = async (id: string, name: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/reports/${id}?format=download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (report: DBReportRecord) => {
    setIsPreviewOpen(true);
    setIsPreviewLoading(true);
    setSelectedReport(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/reports/${report.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data.report || report);
      } else {
        setSelectedReport(report);
      }
    } catch (err) {
      console.error('Failed to load report preview:', err);
      setSelectedReport(report);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyReportData = async () => {
    if (!selectedReport) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedReport.data, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report data:', err);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReportTitle.trim(),
          report_type: newReportType,
        }),
      });

      if (res.ok) {
        setIsGenerateModalOpen(false);
        setNewReportTitle('');
        await fetchReports();
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const visibleReports = reports
    .filter((report) => {
      const query = searchQuery.trim().toLowerCase();
      return !query || [report.id, report.title, report.summary, report.report_type]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortOrder === 'newest' ? difference : -difference;
    });

  return (
    <div className="mx-auto space-y-6 p-4 animate-in fade-in duration-300 sm:p-6 lg:max-w-[1600px] lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Postmortem & Compliance Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-ready postmortem documentation, weekly SLAs, and system resilience reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchReports()}
            className="p-2 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-slate-300 hover:text-white border border-[#1e2433] transition-colors cursor-pointer"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-red-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1c2230] pb-2 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          All Reports
        </button>
        <button
          onClick={() => setActiveTab('incident')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'incident'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          Incident Postmortems
        </button>
        <button
          onClick={() => setActiveTab('weekly_summary')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'weekly_summary'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          Weekly Summaries
        </button>
        <button
          onClick={() => setActiveTab('system_health')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'system_health'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          System Health Audits
        </button>
        <button
          onClick={() => setActiveTab('incident_analysis')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'incident_analysis'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          Incident Analysis
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'performance'
              ? 'text-white bg-red-600/20 text-red-300 border border-red-500/30 font-semibold'
              : 'hover:text-white'
          }`}
        >
          Performance Reports
        </button>
      </div>

      {/* Report controls */}
      <div className="rounded-2xl bg-[#11141c] border border-[#1c2230] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search reports by title, ID, type, or content…"
            className="w-full rounded-xl border border-[#252c3d] bg-[#0a0c10] py-2.5 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-red-500"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500" aria-live="polite">
            {visibleReports.length} of {reports.length} report{reports.length === 1 ? '' : 's'}
            {lastUpdated ? ' · live data loaded' : ''}
          </span>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
              className="rounded-lg border border-[#252c3d] bg-[#0a0c10] px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-red-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500 mb-2" />
            Loading reports from database...
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-[#11141c] border border-[#1c2230] rounded-xl">
            {searchQuery
              ? 'No reports match that search. Try a title, report ID, or type.'
              : 'No reports found for this filter. Click "Generate Report" to compile one from live metrics.'}
          </div>
        ) : (
          visibleReports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl bg-[#11141c] border border-[#1c2230] hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-red-400">
                      {report.id}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {report.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {reportTypeLabels[report.report_type]}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {report.summary}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified Application Data
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => handlePreview(report)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 hover:text-white border border-[#242b3d] text-xs font-medium transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleDownload(report.id, report.title)}
                  disabled={downloadingId === report.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 hover:text-white border border-[#242b3d] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === report.id ? 'animate-bounce text-red-400' : ''}`} />
                  <span>{downloadingId === report.id ? 'Exporting...' : 'Export'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Report preview */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-[#1c2230] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#1c2230]">
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-red-400">{selectedReport?.id || 'Loading report…'}</p>
                <h2 className="truncate text-base font-bold text-white">{selectedReport?.title || 'Report preview'}</h2>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors"
                aria-label="Close report preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {isPreviewLoading || !selectedReport ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-400" />
                  Loading report details…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl bg-[#141824] border border-[#1c2230] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Type</p>
                      <p className="mt-1 text-slate-200">{reportTypeLabels[selectedReport.report_type]}</p>
                    </div>
                    <div className="rounded-xl bg-[#141824] border border-[#1c2230] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Generated</p>
                      <p className="mt-1 text-slate-200">{new Date(selectedReport.created_at).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-[#141824] border border-[#1c2230] p-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Source</p>
                      <p className="mt-1 text-emerald-400">Verified application data</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Executive summary</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{selectedReport.summary}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Structured data</h3>
                      <button
                        onClick={handleCopyReportData}
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-[#1c2230] bg-[#0a0c10] p-4 text-[11px] leading-5 text-slate-300">{JSON.stringify(selectedReport.data, null, 2)}</pre>
                  </div>
                </>
              )}
            </div>

            {selectedReport && !isPreviewLoading && (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1c2230]">
                <button onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Close</button>
                <button
                  onClick={() => handleDownload(selectedReport.id, selectedReport.title)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                >
                  <Download className="w-3.5 h-3.5" /> Export report
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Generate Report */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-[#1c2230] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2230]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-bold text-white">Generate Real Operational Report</h2>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Report Type</label>
                <select
                  value={newReportType}
                  onChange={(e) => setNewReportType(e.target.value as DBReportRecord['report_type'])}
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="incident">Incident Postmortem Report</option>
                  <option value="weekly_summary">Weekly Incident & SLA Summary</option>
                  <option value="system_health">System Health & Compliance Report</option>
                  <option value="incident_analysis">Root Cause & Pattern Analysis</option>
                  <option value="performance">MTTR & Resolution Performance</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  value={newReportTitle}
                  onChange={(e) => setNewReportTitle(e.target.value)}
                  placeholder="Leave empty for automated standard title"
                  className="w-full bg-[#0a0c10] border border-[#1c2230] text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Reports are generated automatically by aggregating live incident records, MTTR figures, and Hindsight organizational learning telemetry.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c2230]">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-red-900/30"
                >
                  {isGenerating ? 'Compiling Report...' : 'Compile & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
