import { Request, Response, NextFunction } from 'express';
import { RecurrenceService } from '../services/recurrence.service';
import { sendSuccess } from '../utils/response';

export class RecurrenceController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RecurrenceService.createRule(req.user!.userId, req.body);
      sendSuccess(res, result, 201, 'Recurring rule created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await RecurrenceService.getRules(req.user!.userId);
      sendSuccess(res, rules, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await RecurrenceService.getRuleById(req.user!.userId, req.params.id);
      sendSuccess(res, rule, 200);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await RecurrenceService.updateRule(
        req.user!.userId,
        req.params.id,
        req.body
      );
      sendSuccess(res, rule, 200, 'Recurring rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await RecurrenceService.deleteRule(req.user!.userId, req.params.id);
      sendSuccess(res, { message: 'Recurring rule deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async process(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RecurrenceService.processDueRecurringExpenses(req.user!.userId);
      sendSuccess(res, result, 200, 'Processed due recurring expenses');
    } catch (error) {
      next(error);
    }
  }
}
