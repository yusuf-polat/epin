import { NextFunction, Request, Response } from 'express';
import { auditService } from './audit.service';
import { AUDIT_BODY_FIELDS } from './audit.constants';

interface AuditOptions {
  /** Hedef kaydın id'si hangi route parametresinde (varsayılan: id) */
  param?: string;
}

function pickBody(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const source = body as Record<string, unknown>;
  const picked = Object.fromEntries(AUDIT_BODY_FIELDS.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));
  return Object.keys(picked).length ? picked : null;
}

/**
 * Yönetim işlemini, istek başarıyla tamamlanınca işlem geçmişine yazar.
 * Gizli alanlar (şifre, API anahtarı) yalnızca izinli alan listesiyle filtrelendiği için kaydedilmez.
 */
export const audited =
  (action: string, targetType: string, summary: string, options: AuditOptions = {}) =>
  (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (res.statusCode >= 400 || !req.user) return;
      void auditService.record({
        actorId: req.user.id,
        action,
        targetType,
        targetId: req.params[options.param ?? 'id'] ?? null,
        summary,
        metadata: pickBody(req.body),
        ip: req.ip ?? null,
      });
    });
    next();
  };
