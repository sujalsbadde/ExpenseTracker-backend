import request from 'supertest';
import { createApp } from '../app';
import prisma from '../prisma';
import { generateTokens } from '../utils/jwt';

jest.mock('../prisma', () => {
  const categories: any[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Food & Dining',
      icon: 'Utensils',
      color: '#EF4444',
      isDefault: true,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Transportation',
      icon: 'Car',
      color: '#F97316',
      isDefault: true,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const expenses: any[] = [];

  return {
    __esModule: true,
    default: {
      category: {
        findFirst: jest.fn(async ({ where }: any) => {
          return categories.find((c) => c.id === where.id) || null;
        }),
        findMany: jest.fn(async () => categories),
      },
      expense: {
        create: jest.fn(async ({ data }: any) => {
          const cat = categories.find((c) => c.id === data.categoryId);
          const record = {
            id: 'b0000000-0000-0000-0000-00000000000' + (expenses.length + 1),
            amount: data.amount,
            description: data.description,
            date: data.date || new Date(),
            paymentMethod: data.paymentMethod || 'CREDIT_CARD',
            isRecurring: data.isRecurring ?? false,
            recurringRuleId: data.recurringRuleId || null,
            receiptUrl: data.receiptUrl || null,
            notes: data.notes || null,
            userId: data.userId,
            categoryId: data.categoryId,
            category: cat,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          expenses.push(record);
          return record;
        }),
        count: jest.fn(async ({ where }: any) => {
          return expenses.filter((e) => {
            if (e.userId !== where.userId) return false;
            if (where.categoryId && e.categoryId !== where.categoryId) return false;
            if (where.amount?.gte && e.amount < where.amount.gte) return false;
            if (where.amount?.lte && e.amount > where.amount.lte) return false;
            return true;
          }).length;
        }),
        findMany: jest.fn(async ({ where, skip = 0, take = 10 }: any) => {
          const filtered = expenses.filter((e) => {
            if (e.userId !== where.userId) return false;
            if (where.categoryId && e.categoryId !== where.categoryId) return false;
            if (where.amount?.gte && e.amount < where.amount.gte) return false;
            if (where.amount?.lte && e.amount > where.amount.lte) return false;
            return true;
          });
          return filtered.slice(skip, skip + take);
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            expenses.find((e) => e.id === where.id && e.userId === where.userId) || null
          );
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const exp = expenses.find((e) => e.id === where.id);
          if (exp) {
            Object.assign(exp, data);
            exp.updatedAt = new Date();
          }
          return exp;
        }),
        delete: jest.fn(async ({ where }: any) => {
          const index = expenses.findIndex((e) => e.id === where.id);
          if (index !== -1) {
            return expenses.splice(index, 1)[0];
          }
          return null;
        }),
      },
      recurringRule: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'rule-uuid-1', ...data, createdAt: new Date(), updatedAt: new Date() })),
        update: jest.fn(async ({ data }: any) => ({ id: 'rule-uuid-1', ...data })),
        delete: jest.fn(async () => null),
      },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          expense: {
            create: jest.fn(async ({ data }: any) => {
              const cat = categories.find((c: any) => c.id === data.categoryId);
              const record = {
                id: 'b0000000-0000-0000-0000-txn1',
                isRecurring: data.isRecurring ?? false,
                recurringRuleId: data.recurringRuleId || null,
                ...data,
                category: cat,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              expenses.push(record);
              return record;
            }),
          },
          recurringRule: {
            create: jest.fn(async ({ data }: any) => ({
              id: 'rule-uuid-1',
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            update: jest.fn(async ({ data }: any) => ({ id: 'rule-uuid-1', ...data })),
          },
        })
      ),
      _reset: () => {
        expenses.length = 0;
      },
      _expenses: expenses,
    },
  };
});

describe('Expense CRUD & Filtering Endpoints (/api/v1/expenses)', () => {
  const app = createApp();
  const testUser = {
    userId: 'user-uuid-1',
    email: 'user1@example.com',
    role: 'USER',
  };
  const otherUser = {
    userId: 'user-uuid-2',
    email: 'user2@example.com',
    role: 'USER',
  };

  const validToken = generateTokens(testUser).accessToken;
  const otherToken = generateTokens(otherUser).accessToken;
  const validCategoryId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    (prisma as any)._reset();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/expenses', () => {
    it('should create an expense with integer cents and payment method', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 3250, // $32.50
          description: 'Team Lunch',
          categoryId: validCategoryId,
          paymentMethod: 'CREDIT_CARD',
          notes: 'Quarterly celebration',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(3250);
      expect(res.body.data.description).toBe('Team Lunch');
      expect(res.body.data.paymentMethod).toBe('CREDIT_CARD');
      expect(res.body.data.userId).toBe(testUser.userId);
    });

    it('should reject expense creation when amount is negative or non-integer', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: -1500, // Invalid: negative
          description: 'Coffee',
          categoryId: validCategoryId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject invalid payment method', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 1500,
          description: 'Coffee',
          categoryId: validCategoryId,
          paymentMethod: 'CRYPTO_UNSUPPORTED',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid UUID categoryId', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 1500,
          description: 'Coffee',
          categoryId: 'non-uuid-string',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/expenses', () => {
    beforeEach(async () => {
      // Seed 3 expenses for user 1
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 1000, // $10.00
          description: 'Coffee',
          categoryId: validCategoryId,
        });

      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 5000, // $50.00
          description: 'Groceries',
          categoryId: validCategoryId,
        });

      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 2500, // $25.00
          description: 'Train Ticket',
          categoryId: 'a0000000-0000-0000-0000-000000000002',
        });
    });

    it('should list paginated expenses for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?page=1&limit=2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(3);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.hasMore).toBe(true);
    });

    it('should filter expenses by amount range in cents', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?minAmount=2000&maxAmount=6000')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items.every((e: any) => e.amount >= 2000 && e.amount <= 6000)).toBe(true);
    });

    it('should filter expenses by categoryId', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses?categoryId=${validCategoryId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items.every((e: any) => e.categoryId === validCategoryId)).toBe(true);
    });
  });

  describe('GET, PUT, DELETE /api/v1/expenses/:id and User Isolation', () => {
    let createdExpenseId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 4500,
          description: 'Dinner',
          categoryId: validCategoryId,
        });

      createdExpenseId = createRes.body.data.id;
    });

    it('should fetch single expense by ID for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdExpenseId);
      expect(res.body.data.amount).toBe(4500);
    });

    it('should deny access (404) when a different user attempts to access the expense', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should update expense details', async () => {
      const res = await request(app)
        .put(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 5200,
          description: 'Dinner with client',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(5200);
      expect(res.body.data.description).toBe('Dinner with client');
    });

    it('should delete expense and return 200', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /api/v1/expenses/summary', () => {
    it('should return aggregated total, category breakdown, and monthly trend', async () => {
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          amount: 3000,
          description: 'Groceries',
          categoryId: validCategoryId,
        });

      const res = await request(app)
        .get('/api/v1/expenses/summary')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSpent).toBe(3000);
      expect(res.body.data.categoryBreakdown).toBeDefined();
      expect(res.body.data.monthlyTrend).toBeDefined();
    });
  });
});
