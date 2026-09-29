import { NextRequest } from 'next/server';
import { getMemoryProvider } from '@/lib/memory-provider';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const provider = getMemoryProvider();
    const memories = await provider.list({ tags: [workspaceMemoryTag(orgId)], strictTags: true });
    const health = await provider.health();
    const dashboardSummary = await dbRepository.getDashboardSummary(orgId);

    const serviceCounts: Record<string, number> = {};
    for (const m of memories) {
      serviceCounts[m.service] = (serviceCounts[m.service] || 0) + 1;
    }
    const recurringPatterns = Object.values(serviceCounts).filter((c) => c >= 2).length;

    return Response.json({
      memories,
      count: memories.length,
      mode: health.mode,
      health: {
        connected: health.connected,
        mode: health.mode,
        details: health.details,
        configured: health.configured,
        persistent: health.persistent,
        statusLabel: health.connected ? 'Hindsight Cloud Connected' : 'Local Demo Memory',
      },
      stats: {
        totalMemories: memories.length,
        successfulOutcomes: memories.filter((m) => m.outcome === 'successful').length,
        recurringPatterns: recurringPatterns || dashboardSummary.recurringPatterns,
        uniqueServices: Array.from(new Set(memories.map((m) => m.service))).length,
        lessonsLearnedCount: memories.filter((m) => m.lessonsLearned && m.lessonsLearned.length > 5).length,
        recentRecalls: dashboardSummary.memoryAssistedInvestigations,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve memories';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Request body must be an object' }, { status: 400 });
    }
    const { query, tags } = body as { query?: unknown; tags?: unknown };
    if (typeof query !== 'string' || !query.trim() || query.length > 8_000) {
      return Response.json({ error: 'Query is required for memory recall' }, { status: 400 });
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || tag.length > 120))) {
      return Response.json({ error: 'tags must be an array of strings' }, { status: 400 });
    }

    const provider = getMemoryProvider();
    const result = await provider.recall(query.trim(), {
      tags: [workspaceMemoryTag(session.user.organization_id), ...((tags as string[] | undefined) || [])],
      strictTags: true,
    });

    return Response.json({
      query: query.trim(),
      results: result.memories,
      count: result.memories.length,
      mode: result.mode,
      recall: result,
    });
  } catch {
    return Response.json({ error: 'Memory recall failed' }, { status: 500 });
  }
}
