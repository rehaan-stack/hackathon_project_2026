import { NextRequest } from 'next/server';
import { getMemoryProvider, scopeMemoryEntry } from '@/lib/memory-provider';
import { parseMemoryEntry } from '@/lib/validation';
import { getSessionFromRequest, workspaceMemoryTag } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const parsed = parseMemoryEntry(await request.json());
    if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const provider = getMemoryProvider();
    const workspaceTag = workspaceMemoryTag(session.user.organization_id);
    const entry = scopeMemoryEntry(parsed.value, workspaceTag);
    const result = await provider.retain(entry);

    return Response.json({
      success: result.success,
      result,
      entry,
      mode: result.mode,
    });
  } catch {
    return Response.json({ error: 'Retention failed' }, { status: 500 });
  }
}
