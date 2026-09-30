import { hasSessionCookie, withSessionCookie } from '@/lib/auth/session';
import { authApi } from './services/auth.api';
import { AuthUser } from './types';

/** Server Component'lerde oturumdaki kullanıcıyı getirir (yoksa null) */
export async function getSessionUser(): Promise<AuthUser | null> {
  if (!hasSessionCookie()) return null;
  try {
    return await authApi.me(withSessionCookie());
  } catch {
    return null;
  }
}
