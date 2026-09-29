import { NextRequest } from 'next/server';
import { dbRepository, DBReportRecord } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';
import { getMemoryProvider } from '@/lib/memory-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const reportType = request.nextUrl.searchParams.get('type');
    let reports = await dbRepository.getReports(orgId);

    if (reportType && reportType !== 'all') {
      reports = reports.filter((r) => r.report_type === reportType);
    }

    return Response.json({
      reports,
      count: reports.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve reports';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;
    const userId = session.user.id;

    const body = await request.json();
    const { title, report_type, incidentId } = body;

    const validTypes: DBReportRecord['report_type'][] = [
      'incident',
      'weekly_summary',
      'system_health',
      'incident_analysis',
      'performance',
    ];

    const type: DBReportRecord['report_type'] = validTypes.includes(report_type)
      ? report_type
      : 'incident';

    // Generate real statistics from application database
    const incidents = await dbRepository.getIncidents(orgId);
    const summary = await dbRepository.getDashboardSummary(orgId);
    const provider = getMemoryProvider();
    const memoryHealth = await provider.health();
    const memories = await provider.list({ tags: [workspaceMemoryTag(orgId)], strictTags: true });

    let reportTitle = title?.trim() || `${type.replace(/_/g, ' ').toUpperCase()} Report`;
    let reportSummary = '';
    let reportData: Record<string, unknown> = {};

    if (type === 'incident') {
      const targetInc = incidentId
        ? incidents.find((i) => i.id === incidentId) || incidents[0]
        : incidents[0];

      reportTitle = title?.trim() || `Incident Postmortem - ${targetInc?.id || 'INC-1090'}`;
      reportSummary = `Postmortem analysis for ${targetInc?.service || 'service'}: ${targetInc?.title || 'Unknown incident'}. Root cause: ${targetInc?.rootCause || 'Investigated'}.`;
      reportData = {
        incident: targetInc,
        symptoms: targetInc?.symptoms || [],
        rootCause: targetInc?.rootCause || 'Under review',
        resolutionTimeMinutes: summary.avgResolutionMinutes,
        memoryRecalled: targetInc?.memoryUsed,
      };
    } else if (type === 'weekly_summary') {
      reportTitle = title?.trim() || `Weekly Operational Summary - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      reportSummary = `Weekly reliability report covering ${incidents.length} incidents across ${summary.systemHealth.servicesHealthy} services with ${summary.resolvedIncidents} resolved.`;
      reportData = {
        totalIncidents: summary.totalIncidents,
        resolved: summary.resolvedIncidents,
        critical: summary.criticalIncidents,
        avgResolutionMinutes: summary.avgResolutionMinutes,
        uptimePercentage: summary.systemHealth.uptimePercentage,
      };
    } else if (type === 'system_health') {
      reportTitle = title?.trim() || 'System Health & SLA Compliance Audit';
      reportSummary = `Production system health report. Status: ${summary.systemHealth.status}. Memory Provider: ${memoryHealth.mode} (${memoryHealth.connected ? 'Connected' : 'Local Demo Memory'}).`;
      reportData = {
        status: summary.systemHealth.status,
        activeAlerts: summary.systemHealth.activeAlerts,
        uptimePercentage: summary.systemHealth.uptimePercentage,
        hindsight: {
          connected: memoryHealth.connected,
          mode: memoryHealth.mode,
          experiencesCount: memories.length,
        },
      };
    } else if (type === 'incident_analysis') {
      reportTitle = title?.trim() || 'Root Cause & Recurrence Analysis Report';
      reportSummary = `Investigation analysis on ${summary.recurringPatterns} recurring patterns and ${summary.aiAssistedInvestigations} autonomous investigations.`;
      reportData = {
        recurringPatterns: summary.recurringPatterns,
        aiAssisted: summary.aiAssistedInvestigations,
        memoryAssisted: summary.memoryAssistedInvestigations,
        topServices: await dbRepository.getAnalyticsServices(orgId),
      };
    } else {
      // performance
      reportTitle = title?.trim() || 'Service MTTR & Resolution Performance';
      reportSummary = `Detailed resolution latency analysis. Mean MTTR: ${summary.avgResolutionMinutes} minutes across all severities.`;
      reportData = {
        avgMttrMinutes: summary.avgResolutionMinutes,
        successfulResolutions: summary.successfulResolutions,
        resolutionBreakdown: await dbRepository.getAnalyticsResolutionTime(orgId),
      };
    }

    const newReport = await dbRepository.createReport(
      {
        title: reportTitle,
        report_type: type,
        summary: reportSummary,
        data: reportData,
      },
      orgId,
      userId
    );

    return Response.json({ report: newReport }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return Response.json({ error: message }, { status: 500 });
  }
}
