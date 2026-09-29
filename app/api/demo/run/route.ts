import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { Incident } from '@/lib/types';
import { getDemoScope, resetDemoScope } from '@/lib/memory-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;
    const { action } = await request.json();

    if (action === 'reset') {
      return Response.json({
        message: 'Demo memory scope reset. Firestore incident history remains available.',
        demoScope: resetDemoScope(),
      });
    }

    const now = new Date().toISOString();
    const incidents: Record<string, Incident> = {
      seed_incident_1: {
        id: 'INC-1090',
        title: 'Checkout API latency spike',
        service: 'Checkout API',
        severity: 'SEV-2',
        status: 'investigating',
        triggeredAt: now,
        symptoms: ['p95 latency increased from 320ms to 4.8s', 'Database connection pool capacity at 100%'],
        logs: ['WARN checkout-api: Connection pool exhausted', 'ERROR checkout-api: timeout waiting for connection'],
        errorInfo: 'PostgreSQL connection pool exhaustion causing cascading checkout timeouts.',
        memoryUsed: false,
        tags: ['checkout', 'database', 'connection-pool', 'latency', getDemoScope()],
      },
      seed_incident_2: {
        id: 'INC-1091',
        title: 'Checkout API latency spike - recurrence',
        service: 'Checkout API',
        severity: 'SEV-2',
        status: 'investigating',
        triggeredAt: now,
        symptoms: ['p95 latency surging past 4.2s', 'Active database connections: 340/350'],
        logs: ['WARN checkout-api: High connection pool saturation', 'ERROR checkout-api: Slow queries detected'],
        errorInfo: 'Suspected recurring database connection saturation on checkout pipeline.',
        memoryUsed: false,
        tags: ['checkout', 'database', 'connection-pool', 'latency', getDemoScope()],
      },
    };

    const incident = incidents[action];
    if (!incident) return Response.json({ error: 'Unknown demo action' }, { status: 400 });

    const saved = await dbRepository.createIncident(incident, orgId, session.user.id);
    return Response.json({ incident: saved }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Demo action failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
