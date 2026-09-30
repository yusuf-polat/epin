import { cookies } from 'next/headers';
import type { RequestOptions } from '@/lib/api/client';

export const AUTH_COOKIE_NAME = 'nexuspin_token';

/**
 * Server Component'lerde kullanıcının oturum cookie'sini backend'e iletmek
 * için header üretir. Yalnızca sunucu tarafında import edilmelidir.
 */
export function withSessionCookie(options: RequestOptions = {}): RequestOptions {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return options;
  return { ...options, headers: { ...options.headers, Cookie: `${AUTH_COOKIE_NAME}=${token}` } };
}

export function hasSessionCookie(): boolean {
  return Boolean(cookies().get(AUTH_COOKIE_NAME)?.value);
}
