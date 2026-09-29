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

    const patterns = await dbRepository.getAnalyticsPatterns(orgId);

    return Response.json({
      patterns,
      count: patterns.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pattern analytics';
    return Response.json({ error: message }, { status: 500 });
  }
}
