import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';
import { investigateIncident } from '@/lib/ai-agent';
import { parseIncident } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;
    const userId = session.user.id;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Request body must be an object' }, { status: 400 });
    }
    const payload = body as { incidentId?: unknown; incident?: unknown };
    let incident;

    if (typeof payload.incidentId === 'string' && payload.incidentId.trim()) {
      incident = await dbRepository.getIncidentById(payload.incidentId.trim(), orgId);
      if (!incident) {
        return Response.json({ error: `Incident ${payload.incidentId} not found` }, { status: 404 });
      }
    } else if (payload.incident) {
      const parsed = parseIncident(payload.incident);
      if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });
      // Prefer the persisted record so client-provided incident data cannot
      // overwrite more recent Firestore changes during an investigation.
      incident = await dbRepository.getIncidentById(parsed.value.id, orgId)
        || await dbRepository.createIncident(parsed.value, orgId, userId);
    } else {
      return Response.json({ error: 'incidentId or incident object required' }, { status: 400 });
    }

    if (!incident) {
      return Response.json({ error: 'Incident not provided' }, { status: 400 });
    }

    // Run AI investigation with Hindsight memory recall
    const result = await investigateIncident(incident, workspaceMemoryTag(orgId));

    const memoryIds = result.previousExperienceUsed.map((memory) => memory.memory.id);
    const persistedIncident = await dbRepository.updateIncident(
      incident.id,
      {
        status: incident.status === 'triggered' ? 'investigating' : incident.status,
        memoryUsed: memoryIds.length > 0,
        memoryIds,
        rootCause: result.likelyRootCause,
      },
      orgId
    );

    if (!persistedIncident) {
      return Response.json({ error: `Incident ${incident.id} not found` }, { status: 404 });
    }

    const investigationId = randomUUID();
    await dbRepository.createInvestigation({
      id: investigationId,
      organization_id: orgId,
      incident_id: incident.id,
      status: 'completed',
      summary: result.summary || `Diagnostic investigation for ${incident.service}`,
      likely_root_cause: result.likelyRootCause,
      confidence: result.confidence,
      started_at: new Date(Date.now() - 5000).toISOString(),
      completed_at: new Date().toISOString(),
      findings: result.evidence.map((finding) => ({
        type: 'evidence',
        finding,
        source: 'telemetry-analysis',
      })),
    });

    if (memoryIds.length > 0) {
      await dbRepository.createIncidentEvent({
        id: randomUUID(),
        organization_id: orgId,
        incident_id: incident.id,
        event_type: 'MEMORY_RECALLED',
        message: `Hindsight recalled ${memoryIds.length} historical experiences matching ${incident.service}.`,
        metadata: {
          memory_ids: memoryIds,
          similarity: result.previousExperienceUsed[0]?.relevance,
        },
        created_at: new Date().toISOString(),
      });
    }

    await dbRepository.createIncidentEvent({
      id: randomUUID(),
      organization_id: orgId,
      incident_id: incident.id,
      event_type: 'ROOT_CAUSE_IDENTIFIED',
      message: `Root cause identified: ${result.likelyRootCause}`,
      metadata: { confidence: result.confidence },
      created_at: new Date().toISOString(),
    });

    return Response.json({
      investigationId,
      incident: persistedIncident,
      investigation: result,
      memory: result.memoryRecall,
      memoryRecalledCount: result.memoryRecall.retrievedCount,
      memoryUsedCount: result.previousExperienceUsed.length,
      hasHistoricalPattern: result.previousExperienceUsed.length > 0,
    });
  } catch (error: unknown) {
    console.error('Investigation failed:', error);
    return Response.json({ error: 'Investigation could not be completed.' }, { status: 500 });
  }
}
