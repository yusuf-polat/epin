import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Async controller'larda fırlatılan hataları global error handler'a iletir */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
