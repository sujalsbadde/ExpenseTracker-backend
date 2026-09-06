import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, sendError } from '../utils/response';
import { config } from '../config';

/**
 * Centralized global error handling middleware.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Custom AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // 2. Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.slice(1).join('.') || e.path[0]?.toString() || 'field',
      message: e.message,
    }));
    sendError(res, 'Validation error', 400, formattedErrors);
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      sendError(res, `A record with this ${target.join(', ') || 'field'} already exists`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Requested resource not found', 404);
      return;
    }
    if (err.code === 'P2003') {
      sendError(res, 'Foreign key constraint failed on the referenced entity', 400);
      return;
    }
  }

  // 4. Default unhandled error
  console.error('Unhandled Application Error:', err);
  const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;
  sendError(res, message, 500);
};
