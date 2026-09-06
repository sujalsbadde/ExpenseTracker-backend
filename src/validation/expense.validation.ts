import { z } from 'zod';

const paymentMethodEnum = z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER'], {
  errorMap: () => ({
    message: 'Payment method must be one of: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, OTHER',
  }),
});

const frequencyEnum = z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional();

export const createExpenseSchema = z.object({
  body: z.object({
    amount: z
      .number({ required_error: 'Amount is required' })
      .int('Amount must be an integer in cents')
      .positive('Amount must be greater than zero cents (positive integer)'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description cannot be empty')
      .max(255, 'Description cannot exceed 255 characters'),
    date: z
      .string()
      .datetime({ message: 'Date must be a valid ISO 8601 date string' })
      .optional(),
    paymentMethod: paymentMethodEnum.optional().default('CREDIT_CARD'),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .uuid('Category ID must be a valid UUID'),
    isRecurring: z.boolean().optional().default(false),
    recurrenceFrequency: frequencyEnum,
    receiptUrl: z.string().url('Receipt URL must be a valid URL').optional().nullable(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Expense ID must be a valid UUID'),
  }),
  body: z
    .object({
      amount: z
        .number()
        .int('Amount must be an integer in cents')
        .positive('Amount must be greater than zero cents')
        .optional(),
      description: z
        .string()
        .trim()
        .min(1, 'Description cannot be empty')
        .max(255, 'Description cannot exceed 255 characters')
        .optional(),
      date: z.string().datetime({ message: 'Date must be a valid ISO 8601 date string' }).optional(),
      paymentMethod: paymentMethodEnum.optional(),
      categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
      isRecurring: z.boolean().optional(),
      receiptUrl: z.string().url('Receipt URL must be a valid URL').optional().nullable(),
      notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

export const expenseIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Expense ID must be a valid UUID'),
  }),
});

export const expenseQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val >= 1, { message: 'Page must be a positive integer >= 1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
        message: 'Limit must be between 1 and 100',
      }),
    startDate: z
      .string()
      .datetime({ message: 'startDate must be a valid ISO 8601 date string' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'endDate must be a valid ISO 8601 date string' })
      .optional(),
    categoryId: z.string().uuid('categoryId must be a valid UUID').optional(),
    minAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val >= 0), {
        message: 'minAmount must be a non-negative integer in cents',
      }),
    maxAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val >= 0), {
        message: 'maxAmount must be a non-negative integer in cents',
      }),
    paymentMethod: paymentMethodEnum.optional(),
    isRecurring: z
      .string()
      .optional()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
    search: z.string().trim().optional(),
    sortBy: z.enum(['date', 'amount', 'createdAt']).optional().default('date'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
export type ExpenseQueryParams = z.infer<typeof expenseQuerySchema>['query'];
