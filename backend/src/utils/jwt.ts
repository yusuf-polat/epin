import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '@/config/env';

export interface JwtPayload {
  id: string;
  role: Role;
}

export interface VerifiedToken extends JwtPayload {
  /** Token'ın üretildiği an (saniye) */
  iat: number;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): VerifiedToken | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'object' && decoded && typeof decoded.id === 'string' && typeof decoded.iat === 'number') {
      return decoded as VerifiedToken;
    }
    return null;
  } catch {
    return null;
  }
}

/** Kısa ömürlü, tek amaçlı token (2FA giriş adımı, 2FA kurulumu). Oturum token'ı yerine geçemez. */
export function signPurposeToken(sub: string, purpose: string, expiresIn: jwt.SignOptions['expiresIn'], extra: Record<string, string> = {}): string {
  return jwt.sign({ ...extra, sub, purpose }, env.JWT_SECRET, { expiresIn });
}

export function verifyPurposeToken<T extends Record<string, unknown> = Record<string, unknown>>(token: string, purpose: string): (T & { sub: string }) | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'object' && decoded && decoded.purpose === purpose && typeof decoded.sub === 'string' && !('id' in decoded)) {
      return decoded as T & { sub: string };
    }
    return null;
  } catch {
    return null;
  }
}
