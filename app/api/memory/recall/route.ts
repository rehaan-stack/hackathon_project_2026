import { NextRequest } from 'next/server';
import { getMemoryProvider } from '@/lib/memory-provider';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const workspaceTag = workspaceMemoryTag(session.user.organization_id);
    const result = await provider.recall(query.trim(), {
      tags: [workspaceTag, ...(tags as string[] | undefined || [])],
      strictTags: true,
    });

    return Response.json({
      query: query.trim(),
      results: result.memories,
      count: result.memories.length,
      mode: result.mode,
      recall: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Memory recall failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
