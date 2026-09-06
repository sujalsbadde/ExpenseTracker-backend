import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Category routes require authentication
router.use(authenticate);

router.get('/', CategoryController.list);

export default router;
