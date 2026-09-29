export const SESSION_COOKIE_NAME = 'recall_session';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name: string;
  avatar_url?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expires_at: number;
}
