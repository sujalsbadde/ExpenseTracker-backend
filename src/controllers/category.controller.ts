import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess } from '../utils/response';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.getCategories(req.user!.userId);
      sendSuccess(res, categories, 200);
    } catch (error) {
      next(error);
    }
  }
}
