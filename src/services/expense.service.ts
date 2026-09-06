import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { AppError } from '../utils/response';
import { CreateExpenseInput, UpdateExpenseInput, ExpenseQueryParams } from '../validation/expense.validation';
import { RecurrenceService } from './recurrence.service';
import {
  ExpenseDTO,
  PaginatedData,
  ExpenseSummaryResponse,
  ExpenseCategorySummary,
  MonthlySpendingSummary,
} from '@expense-tracker/shared';

export class ExpenseService {
  /**
   * Helper to format Prisma Expense entity into ExpenseDTO.
   */
  private static formatExpense(expense: any): ExpenseDTO {
    return {
      id: expense.id,
      amount: expense.amount,
      description: expense.description,
      date: expense.date.toISOString(),
      paymentMethod: expense.paymentMethod,
      isRecurring: expense.isRecurring ?? false,
      recurringRuleId: expense.recurringRuleId,
      receiptUrl: expense.receiptUrl,
      notes: expense.notes,
      userId: expense.userId,
      categoryId: expense.categoryId,
      category: expense.category
        ? {
            id: expense.category.id,
            name: expense.category.name,
            icon: expense.category.icon,
            color: expense.category.color,
            isDefault: expense.category.isDefault,
            userId: expense.category.userId,
            createdAt: expense.category.createdAt.toISOString(),
            updatedAt: expense.category.updatedAt.toISOString(),
          }
        : undefined,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new expense record scoped to the authenticated user.
   */
  static async createExpense(userId: string, input: CreateExpenseInput): Promise<ExpenseDTO> {
    // Validate category exists and is accessible to user (either created by user or default)
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (!category) {
      throw new AppError('Category not found or unauthorized', 404);
    }

    const expenseDate = input.date ? new Date(input.date) : new Date();

    if (input.isRecurring && input.recurrenceFrequency) {
      const { initialExpense } = await RecurrenceService.createRule(userId, {
        amount: input.amount,
        description: input.description,
        frequency: input.recurrenceFrequency,
        startDate: expenseDate.toISOString(),
        categoryId: input.categoryId,
        paymentMethod: input.paymentMethod as any,
        notes: input.notes || undefined,
      });
      return this.formatExpense(initialExpense);
    }

    const expense = await prisma.expense.create({
      data: {
        amount: input.amount,
        description: input.description,
        date: expenseDate,
        paymentMethod: (input.paymentMethod as any) || 'CREDIT_CARD',
        isRecurring: false,
        receiptUrl: input.receiptUrl,
        notes: input.notes,
        userId,
        categoryId: input.categoryId,
      },
      include: {
        category: true,
      },
    });

    return this.formatExpense(expense);
  }

  /**
   * List expenses with pagination and multi-criteria filtering.
   */
  static async getExpenses(
    userId: string,
    params: ExpenseQueryParams
  ): Promise<PaginatedData<ExpenseDTO>> {
    // Auto-materialize any due recurring expenses before querying
    await RecurrenceService.processDueRecurringExpenses(userId);

    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      userId,
    };

    // Recurring filter
    if (params.isRecurring !== undefined) {
      where.isRecurring = params.isRecurring;
    }

    // Date range filter
    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    }

    // Category filter
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    // Amount range filter (in cents)
    if (params.minAmount !== undefined || params.maxAmount !== undefined) {
      where.amount = {};
      if (params.minAmount !== undefined) where.amount.gte = params.minAmount;
      if (params.maxAmount !== undefined) where.amount.lte = params.maxAmount;
    }

    // Payment method filter
    if (params.paymentMethod) {
      where.paymentMethod = params.paymentMethod as any;
    }

    // Search query across description and notes
    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = params.sortBy || 'date';
    const sortOrder = params.sortOrder || 'desc';

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: expenses.map(this.formatExpense),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Retrieve a single expense by ID, enforcing user ownership.
   */
  static async getExpenseById(userId: string, expenseId: string): Promise<ExpenseDTO> {
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId,
      },
      include: {
        category: true,
      },
    });

    if (!expense) {
      throw new AppError('Expense record not found', 404);
    }

    return this.formatExpense(expense);
  }

  /**
   * Update an expense record, enforcing user ownership and category accessibility.
   */
  static async updateExpense(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput
  ): Promise<ExpenseDTO> {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!existing) {
      throw new AppError('Expense record not found', 404);
    }

    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [{ userId }, { isDefault: true }],
        },
      });

      if (!category) {
        throw new AppError('Category not found or unauthorized', 404);
      }
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.date ? { date: new Date(input.date) } : {}),
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod as any } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.receiptUrl !== undefined ? { receiptUrl: input.receiptUrl } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: {
        category: true,
      },
    });

    return this.formatExpense(updated);
  }

  /**
   * Delete an expense record, verifying user ownership.
   */
  static async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!existing) {
      throw new AppError('Expense record not found', 404);
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });
  }

  /**
   * Get aggregated spending metrics for charts and summaries.
   */
  static async getSummary(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExpenseSummaryResponse> {
    const where: Prisma.ExpenseWhereInput = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    let totalSpent = 0;
    const categoryMap = new Map<string, ExpenseCategorySummary>();
    const monthlyMap = new Map<string, MonthlySpendingSummary>();

    for (const exp of expenses) {
      totalSpent += exp.amount;

      // 1. Category aggregation
      const catId = exp.categoryId;
      const existingCat = categoryMap.get(catId);
      if (existingCat) {
        existingCat.totalAmount += exp.amount;
        existingCat.count += 1;
      } else {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: exp.category?.name || 'Uncategorized',
          categoryColor: exp.category?.color,
          categoryIcon: exp.category?.icon,
          totalAmount: exp.amount,
          count: 1,
        });
      }

      // 2. Monthly trend aggregation ("YYYY-MM")
      const monthKey = exp.date.toISOString().substring(0, 7);
      const existingMonth = monthlyMap.get(monthKey);
      if (existingMonth) {
        existingMonth.totalAmount += exp.amount;
        existingMonth.count += 1;
      } else {
        monthlyMap.set(monthKey, {
          month: monthKey,
          totalAmount: exp.amount,
          count: 1,
        });
      }
    }

    return {
      totalSpent,
      categoryBreakdown: Array.from(categoryMap.values()),
      monthlyTrend: Array.from(monthlyMap.values()),
    };
  }
}
