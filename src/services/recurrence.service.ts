import prisma from '../prisma';
import { AppError } from '../utils/response';
import {
  calculateNextOccurrence,
  getDueOccurrences,
  RecurringRuleDTO,
  CreateRecurringRuleRequest,
  UpdateRecurringRuleRequest,
  ExpenseDTO,
} from '@expense-tracker/shared';

export class RecurrenceService {
  private static formatRule(rule: any): RecurringRuleDTO {
    return {
      id: rule.id,
      amount: rule.amount,
      description: rule.description,
      frequency: rule.frequency,
      interval: rule.interval,
      startDate: rule.startDate.toISOString(),
      endDate: rule.endDate ? rule.endDate.toISOString() : null,
      nextDueDate: rule.nextDueDate.toISOString(),
      lastGeneratedDate: rule.lastGeneratedDate ? rule.lastGeneratedDate.toISOString() : null,
      isActive: rule.isActive,
      categoryId: rule.categoryId,
      paymentMethod: rule.paymentMethod,
      notes: rule.notes,
      userId: rule.userId,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new recurring rule and automatically generate the first expense instance.
   */
  static async createRule(
    userId: string,
    input: CreateRecurringRuleRequest
  ): Promise<{ rule: RecurringRuleDTO; initialExpense: any }> {
    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [{ userId }, { isDefault: true }],
      },
    });

    if (!category) {
      throw new AppError('Category not found or unauthorized', 404);
    }

    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : null;
    const interval = input.interval || 1;

    // Calculate next due date following the initial start date
    const nextDueDate = calculateNextOccurrence(
      startDate,
      startDate,
      input.frequency,
      interval
    );

    return prisma.$transaction(async (tx) => {
      const rule = await tx.recurringRule.create({
        data: {
          amount: input.amount,
          description: input.description,
          frequency: input.frequency as any,
          interval,
          startDate,
          endDate,
          nextDueDate,
          lastGeneratedDate: startDate,
          isActive: true,
          categoryId: input.categoryId,
          paymentMethod: (input.paymentMethod as any) || 'CREDIT_CARD',
          notes: input.notes,
          userId,
        },
      });

      // Create initial instance of the expense
      const initialExpense = await tx.expense.create({
        data: {
          amount: input.amount,
          description: input.description,
          date: startDate,
          paymentMethod: (input.paymentMethod as any) || 'CREDIT_CARD',
          isRecurring: true,
          recurringRuleId: rule.id,
          notes: input.notes,
          categoryId: input.categoryId,
          userId,
        },
        include: {
          category: true,
        },
      });

      return {
        rule: this.formatRule(rule),
        initialExpense,
      };
    });
  }

  /**
   * List all recurring rules for a user.
   */
  static async getRules(userId: string): Promise<RecurringRuleDTO[]> {
    const rules = await prisma.recurringRule.findMany({
      where: { userId },
      orderBy: { nextDueDate: 'asc' },
    });

    return rules.map(this.formatRule);
  }

  /**
   * Get a single recurring rule by ID.
   */
  static async getRuleById(userId: string, ruleId: string): Promise<RecurringRuleDTO> {
    const rule = await prisma.recurringRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new AppError('Recurring rule not found', 404);
    }

    return this.formatRule(rule);
  }

  /**
   * Update an existing recurring rule (or pause/stop by setting isActive: false).
   */
  static async updateRule(
    userId: string,
    ruleId: string,
    input: UpdateRecurringRuleRequest
  ): Promise<RecurringRuleDTO> {
    const existing = await prisma.recurringRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!existing) {
      throw new AppError('Recurring rule not found', 404);
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

    const updated = await prisma.recurringRule.update({
      where: { id: ruleId },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.frequency ? { frequency: input.frequency as any } : {}),
        ...(input.interval !== undefined ? { interval: input.interval } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.paymentMethod ? { paymentMethod: input.paymentMethod as any } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    return this.formatRule(updated);
  }

  /**
   * Delete a recurring rule (retains generated past expenses).
   */
  static async deleteRule(userId: string, ruleId: string): Promise<void> {
    const existing = await prisma.recurringRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!existing) {
      throw new AppError('Recurring rule not found', 404);
    }

    await prisma.recurringRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Auto-generates all due expense instances up to a cutoff date (default: now).
   */
  static async processDueRecurringExpenses(
    userId: string,
    cutoffDate = new Date()
  ): Promise<{ generatedCount: number; expenses: any[] }> {
    const activeRules = await prisma.recurringRule.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: { lte: cutoffDate },
      },
    });

    const generatedExpenses: any[] = [];

    for (const rule of activeRules) {
      const dueDates = getDueOccurrences(
        rule.nextDueDate,
        rule.startDate,
        rule.frequency as any,
        rule.interval,
        cutoffDate,
        rule.endDate
      );

      if (dueDates.length === 0) continue;

      let lastDate = rule.lastGeneratedDate || rule.startDate;
      let nextDue = rule.nextDueDate;

      await prisma.$transaction(async (tx) => {
        for (const dueDate of dueDates) {
          const expense = await tx.expense.create({
            data: {
              amount: rule.amount,
              description: rule.description,
              date: dueDate,
              paymentMethod: rule.paymentMethod,
              isRecurring: true,
              recurringRuleId: rule.id,
              notes: rule.notes ? `${rule.notes} (Recurring: ${rule.frequency})` : `Recurring ${rule.frequency}`,
              categoryId: rule.categoryId,
              userId,
            },
          });
          generatedExpenses.push(expense);
          lastDate = dueDate;
        }

        // Calculate next future due date
        nextDue = calculateNextOccurrence(lastDate, rule.startDate, rule.frequency as any, rule.interval);
        const isEnded = rule.endDate && nextDue > rule.endDate;

        await tx.recurringRule.update({
          where: { id: rule.id },
          data: {
            nextDueDate: nextDue,
            lastGeneratedDate: lastDate,
            isActive: !isEnded,
          },
        });
      });
    }

    return {
      generatedCount: generatedExpenses.length,
      expenses: generatedExpenses,
    };
  }
}
