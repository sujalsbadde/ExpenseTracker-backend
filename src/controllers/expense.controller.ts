import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expense.service';
import { sendSuccess } from '../utils/response';

export class ExpenseController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.createExpense(req.user!.userId, req.body);
      sendSuccess(res, expense, 201, 'Expense created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ExpenseService.getExpenses(req.user!.userId, req.query as any);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.getExpenseById(req.user!.userId, req.params.id);
      sendSuccess(res, expense, 200);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.updateExpense(
        req.user!.userId,
        req.params.id,
        req.body
      );
      sendSuccess(res, expense, 200, 'Expense updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ExpenseService.deleteExpense(req.user!.userId, req.params.id);
      sendSuccess(res, { message: 'Expense deleted successfully' }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const summary = await ExpenseService.getSummary(req.user!.userId, startDate, endDate);
      sendSuccess(res, summary, 200);
    } catch (error) {
      next(error);
    }
  }
}
