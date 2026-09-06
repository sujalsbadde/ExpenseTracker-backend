import { Router } from 'express';
import authRoutes from './auth.routes';
import expenseRoutes from './expense.routes';
import categoryRoutes from './category.routes';
import recurrenceRoutes from './recurrence.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/categories', categoryRoutes);
router.use('/recurring', recurrenceRoutes);

export default router;
