import { Response } from 'express';
import { ApiResponse, PaginatedResponse, ApiErrorResponse } from '@expense-tracker/shared';

export class AppError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]> | Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode = 400,
    errors?: Record<string, string[]> | Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  statusCode = 200,
  message?: string
): Response => {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = page < totalPages;

  const response: PaginatedResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore,
      },
    },
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]> | Array<{ field: string; message: string }>
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    message,
    statusCode,
    ...(errors ? { errors } : {}),
  };
  return res.status(statusCode).json(response);
};
