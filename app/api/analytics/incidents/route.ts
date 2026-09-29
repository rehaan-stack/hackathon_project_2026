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

    const timeRange = request.nextUrl.searchParams.get('timeRange') || '7d';
    const incidents = await dbRepository.getIncidents(orgId);

    // Group incidents by day
    const days = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7;
    const trendMap: Record<string, { date: string; critical: number; high: number; medium: number; low: number; total: number }> = {};

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendMap[key] = { date: key, critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }

    for (const inc of incidents) {
      const d = new Date(inc.triggeredAt);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (trendMap[key]) {
        trendMap[key].total++;
        if (inc.severity === 'SEV-1') trendMap[key].critical++;
        else if (inc.severity === 'SEV-2') trendMap[key].high++;
        else if (inc.severity === 'SEV-3') trendMap[key].medium++;
        else trendMap[key].low++;
      }
    }

    return Response.json({
      trends: Object.values(trendMap),
      totalIncidents: incidents.length,
      timeRange,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch incident trends';
    return Response.json({ error: message }, { status: 500 });
  }
}
