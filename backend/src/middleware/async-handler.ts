import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not forward rejected promises from async handlers to
 * the error middleware — an uncaught rejection there crashes the
 * process. Wrapping routes here keeps every failure on the normal
 * res/next error path instead.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
