export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public, dependency-free readiness probe for hosting providers. */
export async function GET() {
  return Response.json({ status: 'ok', service: 'recall' });
}
