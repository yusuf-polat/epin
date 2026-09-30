import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { userRepository } from '@/modules/users/user.repository';
import { AUTH_COOKIE_NAME } from '@/config/cookies';
import { verifyAccessToken } from '@/utils/jwt';
import { ForbiddenError, UnauthorizedError } from '@/utils/errors';
import { asyncHandler } from '@/utils/asyncHandler';
import { hasPermission, Permission } from '@/modules/permissions/permission.service';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  canSell: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Token önce HttpOnly cookie'den, yoksa Authorization: Bearer header'ından okunur */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function resolveUser(req: Request): Promise<{ user: AuthUser | null; bannedReason?: string | null }> {
  const token = extractToken(req);
  if (!token) return { user: null };

  const payload = verifyAccessToken(token);
  if (!payload) return { user: null };

  const dbUser = await userRepository.findAuthUser(payload.id);
  if (!dbUser) return { user: null };
  // Şifre değiştiyse (sıfırlama dahil) önceki oturumlar kapanır
  if (dbUser.passwordChangedAt && payload.iat < Math.floor(dbUser.passwordChangedAt.getTime() / 1000)) return { user: null };
  if (dbUser.isBanned) return { user: null, bannedReason: dbUser.banReason ?? 'Belirtilmedi' };

  // Rol ve satıcı yetkisi her istekte DB'den okunur; token'daki eski rol güvenilmez
  return { user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, canSell: dbUser.canSell } };
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const { user, bannedReason } = await resolveUser(req);
  if (bannedReason !== undefined) {
    throw new ForbiddenError(`Hesabınız askıya alınmıştır. Sebep: ${bannedReason}`, 'ACCOUNT_BANNED');
  }
  if (!user) throw new UnauthorizedError('Oturumunuz bulunamadı veya süresi doldu');
  req.user = user;
  next();
});

export const optionalAuthenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const { user } = await resolveUser(req);
  if (user) req.user = user;
  next();
});

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    return next();
  };

export const requireAdmin = requireRole('ADMIN');
export const requireStaff = requireRole('ADMIN', 'DESTEK');

/** Onaylı satıcı (canSell) veya ADMIN */
export const requireSeller = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.role === 'ADMIN' || req.user.canSell) return next();
  return next(new ForbiddenError('Satıcı yetkisi gereklidir. Lütfen satıcı başvurusu yapınız.', 'SELLER_REQUIRED'));
};

/**
 * Rol-yetki matrisine göre yetki kontrolü. ADMIN her zaman geçer,
 * diğer roller panelden verilen izinlere göre değerlendirilir.
 */
export const requirePermission = (permission: Permission) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role === 'ADMIN') return next();
    const allowed = await hasPermission(req.user.role, permission);
    if (!allowed) throw new ForbiddenError('Bu işlem için yetkiniz bulunmamaktadır', 'PERMISSION_DENIED');
    next();
  });
