import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const payload: ApiSuccess<T> = { success: true, data, ...(message ? { message } : {}) };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(res: Response, items: T[], meta: PaginationMeta, message?: string): Response {
  const payload: ApiSuccess<T[]> = { success: true, data: items, meta, ...(message ? { message } : {}) };
  return res.status(200).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const payload: ApiFailure = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(statusCode).json(payload);
}
