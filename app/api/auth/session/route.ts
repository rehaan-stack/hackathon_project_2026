import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS, syncAuthUserProfile } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'A Firebase ID token is required.' }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const authenticatedAt = decodedToken.auth_time || 0;

    if (Date.now() / 1000 - authenticatedAt > 5 * 60) {
      return NextResponse.json(
        { error: 'Please sign in again before creating a session.' },
        { status: 401 }
      );
    }

    await syncAuthUserProfile(decodedToken);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to create a secure session.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
