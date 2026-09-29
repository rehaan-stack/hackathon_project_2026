import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const incidents = await dbRepository.getRecentIncidents(orgId, 5);

    return Response.json({
      incidents,
      count: incidents.length,
    });
  } catch (error: unknown) {
    console.error('Failed to get recent incidents:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve recent incidents';
    return Response.json({ error: message }, { status: 500 });
  }
}
