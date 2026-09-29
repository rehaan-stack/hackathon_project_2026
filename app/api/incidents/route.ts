import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { parseIncident } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const orgId = session.user.organization_id;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const service = searchParams.get('service');
  const query = searchParams.get('q');
  const sort = searchParams.get('sort') || 'date_desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let list = await dbRepository.getIncidents(orgId);

  if (status && status !== 'all') {
    list = list.filter((i) => i.status.toLowerCase() === status.toLowerCase());
  }
  if (severity && severity !== 'all') {
    list = list.filter((i) => i.severity.toLowerCase() === severity.toLowerCase());
  }
  if (service && service !== 'all') {
    list = list.filter((i) => i.service.toLowerCase().includes(service.toLowerCase()));
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.service.toLowerCase().includes(q) ||
        i.symptoms.some((s) => s.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sort === 'date_asc') {
    list.sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
  } else {
    list.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  const totalCount = list.length;
  const startIndex = (page - 1) * limit;
  const paginatedList = list.slice(startIndex, startIndex + limit);

  return Response.json({
    incidents: paginatedList,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;
    const userId = session.user.id;

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Request body must be an object' }, { status: 400 });
    }
    const candidate = body as Record<string, unknown>;
    const parsed = parseIncident({
      ...candidate,
      id: typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      status: candidate.status || 'investigating',
      triggeredAt: candidate.triggeredAt || new Date().toISOString(),
      memoryUsed: Boolean(candidate.memoryUsed),
    });
    if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    const newIncident = await dbRepository.createIncident(
      {
        ...parsed.value,
        description: typeof candidate.description === 'string' ? candidate.description : undefined,
        impact: typeof candidate.impact === 'string' ? candidate.impact : undefined,
      },
      orgId,
      userId
    );

    return Response.json({ incident: newIncident }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create incident';
    return Response.json({ error: message }, { status: 400 });
  }
}
