import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
  expenseQuerySchema,
} from '../validation/expense.validation';

const router = Router();

// All expense routes require authentication
router.use(authenticate);

// List expenses with pagination and multi-filtering
router.get('/', validate(expenseQuerySchema), ExpenseController.list);

// Aggregated summary metrics for charts & reports (must be above /:id)
router.get('/summary', ExpenseController.getSummary);

// Create expense
router.post('/', validate(createExpenseSchema), ExpenseController.create);

// Get single expense by ID
router.get('/:id', validate(expenseIdParamSchema), ExpenseController.getById);

// Update expense by ID
router.put('/:id', validate(updateExpenseSchema), ExpenseController.update);

// Delete expense by ID
router.delete('/:id', validate(expenseIdParamSchema), ExpenseController.delete);

export default router;
