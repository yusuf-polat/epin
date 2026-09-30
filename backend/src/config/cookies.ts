import { CookieOptions, Response } from 'express';
import { env } from './env';

export const AUTH_COOKIE_NAME = 'nexuspin_token';

/** JWT_EXPIRES_IN ("7d", "12h", "3600") değerini milisaniyeye çevirir */
function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  path: '/',
  domain: env.COOKIE_DOMAIN || undefined,
  maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
};

/** Oturum cookie'sini yazar (giriş, kayıt ve şifre değişikliği sonrası) */
export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}
