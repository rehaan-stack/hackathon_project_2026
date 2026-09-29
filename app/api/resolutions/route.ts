import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';
import { buildMemoryEntry, getMemoryProvider } from '@/lib/memory-provider';
import { parseResolutionForm } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;
    const rawBody = await request.json();
    const parsed = parseResolutionForm(rawBody);
    if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const currentIncident = await dbRepository.getIncidentById(parsed.value.incidentId, orgId);
    if (!currentIncident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    const resolvedAt = new Date().toISOString();
    const resolvedIncident = await dbRepository.updateIncident(
      currentIncident.id,
      {
        status: 'resolved',
        resolvedAt,
        rootCause: parsed.value.rootCause,
        resolution: parsed.value.actionTaken,
        resolutionOutcome: parsed.value.outcome,
        lessonsLearned: parsed.value.additionalLesson,
      },
      orgId
    );
    if (!resolvedIncident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    const memory = buildMemoryEntry(resolvedIncident, parsed.value, workspaceMemoryTag(orgId));
    const retention = await getMemoryProvider().retain(memory);
    const body = rawBody as Record<string, unknown>;
    const resolutionId = randomUUID();

    await dbRepository.createResolution({
      id: resolutionId,
      organization_id: orgId,
      incident_id: resolvedIncident.id,
      root_cause: parsed.value.rootCause,
      actions_taken: parsed.value.actionTaken,
      outcome: parsed.value.outcome || 'successful',
      resolution_time_minutes: parsed.value.resolutionTimeMinutes || 35,
      lessons_learned: parsed.value.additionalLesson,
      verified: body.verified !== false,
      hindsight_memory_id: memory.id || retention.id,
      created_at: resolvedAt,
    });

    return Response.json(
      {
        success: true,
        resolutionId,
        incident: resolvedIncident,
        retainedMemory: memory,
        retention,
        message: retention.message,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Failed to create Firestore resolution:', error);
    const message = error instanceof Error ? error.message : 'Failed to record resolution';
    return Response.json({ error: message }, { status: 500 });
  }
}
