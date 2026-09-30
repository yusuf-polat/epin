import { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { sendError } from '@/utils/apiResponse';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie tabanlı oturum için CSRF katmanı: durum değiştiren isteklerde
 * Origin header'ı varsa izinli origin listesinde olmalıdır.
 * (SameSite=Lax cookie ile birlikte ikinci savunma hattı)
 */
export const originGuard = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) return next();
  return sendError(res, 403, 'ORIGIN_NOT_ALLOWED', 'İstek kaynağına izin verilmiyor');
};
