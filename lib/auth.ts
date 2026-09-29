import 'server-only';

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { DEFAULT_ORG_ID } from './db';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from './firebase/admin';
import { SESSION_COOKIE_NAME, type AuthSession, type AuthUser } from './auth-constants';

export { SESSION_COOKIE_NAME };
export type { AuthUser, AuthSession };

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type UserProfile = Partial<{
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name: string;
  avatar_url: string;
}>;

function fallbackName(email?: string) {
  return email?.split('@')[0] || 'RECALL Operator';
}

function personalWorkspaceId(userId: string) {
  return `user-${userId}`;
}

function personalWorkspaceName(fullName: string) {
  return `${fullName}'s RECALL workspace`;
}

export function workspaceMemoryTag(organizationId: string) {
  return `workspace:${organizationId}`;
}

export async function syncAuthUserProfile(decodedToken: DecodedIdToken): Promise<AuthUser> {
  const db = getFirebaseAdminDb();
  const profileRef = db.collection('users').doc(decodedToken.uid);
  const snapshot = await profileRef.get();
  const profile = (snapshot.data() || {}) as UserProfile;
  const email = decodedToken.email || profile.email || '';
  const fullName = profile.full_name || decodedToken.name || fallbackName(email);
  const role = profile.role || 'SRE / Incident Responder';
  // A workspace belongs to exactly one Firebase Auth user. Move legacy
  // accounts out of the former shared demo organization at their next login.
  const usesLegacySharedWorkspace = !profile.organization_id || profile.organization_id === DEFAULT_ORG_ID;
  const organizationId = usesLegacySharedWorkspace
    ? personalWorkspaceId(decodedToken.uid)
    : profile.organization_id || personalWorkspaceId(decodedToken.uid);
  const organizationName = usesLegacySharedWorkspace
    ? personalWorkspaceName(fullName)
    : profile.organization_name || personalWorkspaceName(fullName);
  const avatarUrl = profile.avatar_url || decodedToken.picture;

  await profileRef.set(
    {
      email,
      full_name: fullName,
      role,
      organization_id: organizationId,
      organization_name: organizationName,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: FieldValue.serverTimestamp(),
      ...(snapshot.exists ? {} : { created_at: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );

  return {
    id: decodedToken.uid,
    email,
    full_name: fullName,
    role,
    organization_id: organizationId,
    organization_name: organizationName,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  };
}

function toSession(decodedToken: DecodedIdToken, user: AuthUser): AuthSession {
  return {
    user,
    token: decodedToken.uid,
    expires_at: (decodedToken.exp || Math.floor(Date.now() / 1000)) * 1000,
  };
}

async function verifySessionCookie(sessionCookie: string): Promise<AuthSession | null> {
  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await syncAuthUserProfile(decodedToken);
    return toSession(decodedToken, user);
  } catch {
    return null;
  }
}

/** Returns the current Firebase session after server-side verification. */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return sessionCookie ? verifySessionCookie(sessionCookie) : null;
}

/** Returns a verified Firebase session for a route handler request. */
export async function getSessionFromRequest(request: NextRequest): Promise<AuthSession | null> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return sessionCookie ? verifySessionCookie(sessionCookie) : null;
}

/** Creates or updates the profile stored in Firestore for the current user. */
export async function updateAuthUserProfile(
  user: AuthUser,
  updates: Pick<Partial<AuthUser>, 'full_name' | 'role' | 'organization_name'>
): Promise<AuthUser> {
  const db = getFirebaseAdminDb();
  const profileRef = db.collection('users').doc(user.id);
  const firestoreUpdates = {
    ...updates,
    updated_at: FieldValue.serverTimestamp(),
  };

  await profileRef.set(firestoreUpdates, { merge: true });

  if (updates.full_name) {
    await getFirebaseAdminAuth().updateUser(user.id, { displayName: updates.full_name });
  }

  return { ...user, ...updates };
}
