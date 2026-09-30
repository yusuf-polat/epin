import { Request, Response } from 'express';
import { sendError } from '@/utils/apiResponse';

export const notFound = (req: Request, res: Response) =>
  sendError(res, 404, 'ROUTE_NOT_FOUND', `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`);
