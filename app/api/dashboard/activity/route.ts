import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';
import { getMemoryProvider } from '@/lib/memory-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const activities = await dbRepository.getRecentActivity(orgId, 10);
    const incidents = await dbRepository.getIncidents(orgId);
    const incidentMap = new Map<string, { service: string; title: string }>();
    for (const inc of incidents) {
      if (inc.id) {
        incidentMap.set(inc.id.toUpperCase(), { service: inc.service, title: inc.title });
      }
    }

    const provider = getMemoryProvider();
    const memories = await provider.list({ tags: [workspaceMemoryTag(orgId)], strictTags: true });

    const recentLearning = memories.slice(0, 5).map((m) => {
      let resolvedService = m.service;

      if (!resolvedService || resolvedService === 'Unknown service' || resolvedService === 'Unknown') {
        const incMatch =
          (m.incidentId && incidentMap.get(m.incidentId.toUpperCase())) ||
          (m.rootCause && m.rootCause.match(/INC-\d+/i) && incidentMap.get(m.rootCause.match(/INC-\d+/i)![0].toUpperCase()));

        if (incMatch) {
          resolvedService = incMatch.service;
        } else if (/checkout/i.test(m.rootCause || '')) {
          resolvedService = 'checkout-service';
        } else if (/payment/i.test(m.rootCause || '')) {
          resolvedService = 'payment-service';
        } else if (/user|profile/i.test(m.rootCause || '')) {
          resolvedService = 'user-service';
        } else if (/notification/i.test(m.rootCause || '')) {
          resolvedService = 'notification-service';
        } else if (/inventory/i.test(m.rootCause || '')) {
          resolvedService = 'inventory-service';
        } else {
          resolvedService = 'Core Service';
        }
      }

      const cleanCause = (m.rootCause || 'Institutional memory pattern').replace(/\s+/g, ' ').trim();

      return {
        id: m.id,
        incidentId: m.incidentId,
        service: resolvedService,
        rootCause: cleanCause,
        outcome: m.outcome,
        timestamp: m.timestamp,
        summary: `Retained solution for ${resolvedService}: ${cleanCause.slice(0, 75)}...`,
      };
    });

    return Response.json({
      activities,
      learning: recentLearning,
      count: activities.length,
    });
  } catch (error: unknown) {
    console.error('Failed to get dashboard activity:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve activity';
    return Response.json({ error: message }, { status: 500 });
  }
}
