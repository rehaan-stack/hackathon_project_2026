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

    const summary = await dbRepository.getDashboardSummary(orgId);
    const provider = getMemoryProvider();
    const memoryHealth = await provider.health();
    const memories = await provider.list({ tags: [workspaceMemoryTag(orgId)], strictTags: true });

    return Response.json({
      summary: {
        ...summary,
        hindsight: {
          connected: memoryHealth.connected,
          mode: memoryHealth.mode,
          details: memoryHealth.details,
          isConfigured: memoryHealth.configured,
          totalMemories: memories.length,
          recentRecalls: summary.memoryAssistedInvestigations,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Failed to generate dashboard summary:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve dashboard summary';
    return Response.json({ error: message }, { status: 500 });
  }
}
