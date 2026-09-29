import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, updateAuthUserProfile } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : undefined;
    const role = typeof body.role === 'string' ? body.role.trim() : undefined;
    const organizationName = typeof body.organization_name === 'string' ? body.organization_name.trim() : undefined;

    if ((fullName !== undefined && (fullName.length < 2 || fullName.length > 100)) ||
        (role !== undefined && (role.length < 2 || role.length > 100)) ||
        (organizationName !== undefined && (organizationName.length < 2 || organizationName.length > 100))) {
      return NextResponse.json({ error: 'Each setting must be between 2 and 100 characters.' }, { status: 400 });
    }

    const updatedUser = await updateAuthUserProfile(session.user, {
      ...(fullName !== undefined ? { full_name: fullName } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(organizationName !== undefined ? { organization_name: organizationName } : {}),
    });

    return NextResponse.json({ authenticated: true, user: updatedUser });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to update account settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
