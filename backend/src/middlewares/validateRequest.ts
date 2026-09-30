import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '@/utils/errors';

/**
 * Zod hatalarını istemcinin form alanlarıyla eşleyebileceği biçime çevirir:
 * { "email": ["..."], "items.0.quantity": ["..."] } (body/query/params öneki atılır)
 */
function toFieldErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.slice(1).join('.') || '_form';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/**
 * { body, query, params } şeklindeki Zod şemasına göre isteği doğrular.
 * Parse edilmiş (coerce/default uygulanmış) değerler req üzerine yazılır.
 */
export const validateRequest =
  (schema: AnyZodObject) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body ?? {},
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new ValidationError(toFieldErrors(error), error.issues[0]?.message ?? 'Geçersiz istek'));
      }
      return next(error);
    }
  };
