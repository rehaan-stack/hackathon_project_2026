import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';
import { investigateIncident } from '@/lib/ai-agent';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const body = await request.json();
    const { incidentId } = body;

    if (!incidentId) {
      return Response.json({ error: 'incidentId is required' }, { status: 400 });
    }

    const incident = await dbRepository.getIncidentById(incidentId, orgId);
    if (!incident) {
      return Response.json({ error: `Incident ${incidentId} not found` }, { status: 404 });
    }

    // Run AI investigation with real Hindsight memory recall
    const result = await investigateIncident(incident, workspaceMemoryTag(orgId));

    // Save DB Investigation
    const investigationId = randomUUID();
    await dbRepository.createInvestigation({
      id: investigationId,
      organization_id: orgId,
      incident_id: incidentId,
      status: 'completed',
      summary: result.summary || `Diagnostic investigation for ${incident.service}`,
      likely_root_cause: result.likelyRootCause,
      confidence: result.confidence,
      started_at: new Date(Date.now() - 5000).toISOString(),
      completed_at: new Date().toISOString(),
      findings: result.evidence.map((ev: string) => ({
        type: 'evidence',
        finding: ev,
        source: 'telemetry-analysis',
      })),
    });

    // Update incident status & memory IDs
    await dbRepository.updateIncident(incidentId, {
      status: 'investigating',
      memoryUsed: result.previousExperienceUsed.length > 0,
      memoryIds: result.previousExperienceUsed.map((m) => m.memory.id),
      rootCause: result.likelyRootCause,
    }, orgId);

    // Record Memory Recalled event if any
    if (result.previousExperienceUsed.length > 0) {
      await dbRepository.createIncidentEvent({
        id: randomUUID(),
        organization_id: orgId,
        incident_id: incidentId,
        event_type: 'MEMORY_RECALLED',
        message: `Hindsight recalled ${result.previousExperienceUsed.length} historical experiences matching ${incident.service}.`,
        metadata: {
          memory_ids: result.previousExperienceUsed.map((m) => m.memory.id),
          similarity: result.previousExperienceUsed[0]?.relevance,
        },
        created_at: new Date().toISOString(),
      });
    }

    // Record root cause identified event
    await dbRepository.createIncidentEvent({
      id: randomUUID(),
      organization_id: orgId,
      incident_id: incidentId,
      event_type: 'ROOT_CAUSE_IDENTIFIED',
      message: `Root cause identified: ${result.likelyRootCause}`,
      metadata: { confidence: result.confidence },
      created_at: new Date().toISOString(),
    });

    return Response.json({
      investigationId,
      summary: result.summary,
      findings: result.evidence.map((ev: string) => ({
        type: 'evidence',
        finding: ev,
        source: 'system-metrics',
      })),
      evidence: result.evidence,
      historical_context: result.historicalContext,
      likely_root_cause: result.likelyRootCause,
      recommended_actions: result.recommendedActions,
      confidence: result.confidence,
      memory_matches: result.previousExperienceUsed,
      uncertainties: result.uncertainties,
      investigation: result,
      memory: result.memoryRecall,
      hasHistoricalPattern: result.previousExperienceUsed.length > 0,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create investigation:', error);
    const message = error instanceof Error ? error.message : 'Investigation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
