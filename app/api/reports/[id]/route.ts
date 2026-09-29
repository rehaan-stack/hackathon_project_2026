import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const orgId = session.user.organization_id;

    const report = await dbRepository.getReportById(id, orgId);
    if (!report) {
      return Response.json({ error: `Report ${id} not found` }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get('format');
    if (format === 'download') {
      const content = [
        `================================================================`,
        `RECALL OPERATIONAL INTELLIGENCE REPORT`,
        `================================================================`,
        `Report ID:    ${report.id}`,
        `Title:        ${report.title}`,
        `Type:         ${report.report_type.toUpperCase()}`,
        `Generated:    ${report.created_at}`,
        `Organization: RECALL Engineering`,
        `----------------------------------------------------------------`,
        `EXECUTIVE SUMMARY:`,
        `${report.summary}`,
        `----------------------------------------------------------------`,
        `STRUCTURED DATA:`,
        JSON.stringify(report.data, null, 2),
        `================================================================`,
      ].join('\n');

      return new Response(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${report.title.replace(/\s+/g, '_')}.txt"`,
        },
      });
    }

    return Response.json({ report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report';
    return Response.json({ error: message }, { status: 500 });
  }
}
