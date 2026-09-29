import { NextRequest } from 'next/server';
import { dbRepository, IncidentEvent } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getMemoryProvider } from '@/lib/memory-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const orgId = session.user.organization_id;

  const incident = await dbRepository.getIncidentById(id, orgId);

  if (!incident) {
    return Response.json({ error: `Incident ${id} not found` }, { status: 404 });
  }

  const events = await dbRepository.getIncidentEvents(id, orgId);

  // Retrieve relevant Hindsight memories
  let relatedMemories: unknown[] = [];
  try {
    const provider = getMemoryProvider();
    const query = `${incident.service} ${incident.title} ${incident.symptoms.join(' ')}`;
    const recallResult = await provider.recall(query);
    relatedMemories = recallResult.memories;
  } catch (err) {
    console.warn('Could not retrieve related memories for incident:', err);
  }

  return Response.json({
    incident,
    timeline: events,
    relatedMemories,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const orgId = session.user.organization_id;

  try {
    const updates = await request.json();
    const prevIncident = await dbRepository.getIncidentById(id, orgId);

    const updated = await dbRepository.updateIncident(id, updates, orgId);

    // Record lifecycle events automatically based on status changes
    if (updates.status && (!prevIncident || prevIncident.status !== updates.status)) {
      if (updates.status === 'investigating') {
        await dbRepository.addIncidentEvent(
          id,
          'INVESTIGATION_STARTED',
          `Incident ${id} status updated to Investigating.`,
          { previousStatus: prevIncident?.status },
          orgId
        );
      } else if (updates.status === 'resolved') {
        await dbRepository.addIncidentEvent(
          id,
          'INCIDENT_RESOLVED',
          `Incident ${id} marked as Resolved. ${updates.rootCause ? `Root cause: ${updates.rootCause}` : ''}`,
          { rootCause: updates.rootCause },
          orgId
        );
      } else if (updates.status === 'triggered' && prevIncident?.status === 'resolved') {
        await dbRepository.addIncidentEvent(
          id,
          'INCIDENT_REOPENED',
          `Incident ${id} was reopened by operator.`,
          { previousStatus: prevIncident.status },
          orgId
        );
      }
    }

    if (updates.rootCause && (!prevIncident || prevIncident.rootCause !== updates.rootCause)) {
      await dbRepository.addIncidentEvent(
        id,
        'ROOT_CAUSE_IDENTIFIED',
        `Root cause recorded: ${updates.rootCause}`,
        { rootCause: updates.rootCause },
        orgId
      );
    }

    if (!updated) {
      return Response.json({ error: 'Incident not found' }, { status: 404 });
    }

    const currentEvents = await dbRepository.getIncidentEvents(id, orgId);
    return Response.json({ incident: updated, timeline: currentEvents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update incident';
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const orgId = session.user.organization_id;

  try {
    const body = await request.json();
    const { eventType, message, metadata } = body;

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Event message is required' }, { status: 400 });
    }

    const validEventType: IncidentEvent['event_type'] = (eventType as IncidentEvent['event_type']) || 'EVENT_ADDED';

    const newEvent = await dbRepository.addIncidentEvent(
      id,
      validEventType,
      message.trim(),
      metadata || {},
      orgId
    );

    return Response.json({ event: newEvent }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create event';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const orgId = session.user.organization_id;

  const deleted = await dbRepository.deleteIncident(id, orgId);
  return Response.json({ success: deleted, id });
}
