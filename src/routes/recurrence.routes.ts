import { Router } from 'express';
import { RecurrenceController } from '../controllers/recurrence.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
  recurringRuleIdParamSchema,
} from '../validation/recurrence.validation';

const router = Router();

// All recurring routes require authentication
router.use(authenticate);

// List all user recurring rules
router.get('/', RecurrenceController.list);

// Create new recurring rule
router.post('/', validate(createRecurringRuleSchema), RecurrenceController.create);

// Trigger manual check and generation of due recurring expenses
router.post('/process', RecurrenceController.process);

// Get single rule by ID
router.get('/:id', validate(recurringRuleIdParamSchema), RecurrenceController.getById);

// Update/pause rule
router.put('/:id', validate(updateRecurringRuleSchema), RecurrenceController.update);

// Delete/cancel rule
router.delete('/:id', validate(recurringRuleIdParamSchema), RecurrenceController.delete);

export default router;
