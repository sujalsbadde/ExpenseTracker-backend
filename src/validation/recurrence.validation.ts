import { z } from 'zod';

const frequencyEnum = z.enum(['WEEKLY', 'MONTHLY', 'YEARLY'], {
  errorMap: () => ({ message: 'Frequency must be one of: WEEKLY, MONTHLY, YEARLY' }),
});

const paymentMethodEnum = z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']);

export const createRecurringRuleSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .int('Amount must be an integer in cents')
      .positive('Amount must be greater than zero cents'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty')
      .max(255, 'Description cannot exceed 255 characters'),
    frequency: frequencyEnum,
    interval: z.number().int().min(1).max(52).optional().default(1),
    startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 date string' }),
    endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 date string' }).optional().nullable(),
    categoryId: z.string().uuid('Category ID must be a valid UUID'),
    paymentMethod: paymentMethodEnum.optional().default('CREDIT_CARD'),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const updateRecurringRuleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Recurring rule ID must be a valid UUID'),
  }),
  body: z
    .object({
      amount: z.number().int().positive().optional(),
      description: z.string().trim().min(1).max(255).optional(),
      frequency: frequencyEnum.optional(),
      interval: z.number().int().min(1).max(52).optional(),
      endDate: z.string().datetime().optional().nullable(),
      isActive: z.boolean().optional(),
      categoryId: z.string().uuid().optional(),
      paymentMethod: paymentMethodEnum.optional(),
      notes: z.string().max(1000).optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

export const recurringRuleIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Recurring rule ID must be a valid UUID'),
  }),
});
