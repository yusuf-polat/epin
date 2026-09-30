import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@/utils/errors';
import { sendError } from '@/utils/apiResponse';
import { logger } from '@/utils/logger';

interface HttpLikeError {
  type?: string;
  status?: number;
  statusCode?: number;
}

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(res, 422, 'VALIDATION_ERROR', 'Geçersiz istek', err.flatten().fieldErrors);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'DUPLICATE_RECORD', 'Bu kayıt zaten mevcut');
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Kayıt bulunamadı');
    }
    if (err.code === 'P2003') {
      return sendError(res, 409, 'RELATION_CONSTRAINT', 'Kayıt başka verilerle ilişkili olduğu için işlem yapılamadı');
    }
  }

  // body-parser hataları (bozuk JSON, çok büyük gövde)
  const httpErr = err as HttpLikeError;
  if (httpErr?.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'İstek gövdesi geçerli bir JSON değil');
  }
  if (httpErr?.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'İstek gövdesi çok büyük');
  }

  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}`, err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Beklenmeyen bir hata oluştu');
};
