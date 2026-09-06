import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

/**
 * Generic middleware for validating incoming requests against a Zod schema.
 * Validates req.body, req.query, and req.params as specified by the schema.
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed/transformed values back to request
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query as unknown as Request['query'];
      if (parsed.params !== undefined) req.params = parsed.params as unknown as Request['params'];

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.slice(1).join('.') || err.path[0]?.toString() || 'field',
          message: err.message,
        }));

        sendError(res, 'Validation failed', 400, formattedErrors);
        return;
      }
      next(error);
    }
  };
};
