import { CategoryDTO } from './category';
import { RecurrenceFrequency } from './recurrence';

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface ExpenseDTO {
  id: string;
  // Amount in integer cents (e.g. 2500 for $25.00)
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  isRecurring: boolean;
  recurringRuleId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  userId: string;
  categoryId: string;
  category?: CategoryDTO;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  // Amount in integer cents (must be positive integer)
  amount: number;
  description: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  categoryId: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  receiptUrl?: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  isRecurring?: boolean;
  receiptUrl?: string;
  notes?: string;
}

export interface ExpenseFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  isRecurring?: boolean;
  search?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseCategorySummary {
  categoryId: string;
  categoryName: string;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  totalAmount: number; // in cents
  count: number;
}

export interface MonthlySpendingSummary {
  month: string; // "YYYY-MM"
  totalAmount: number; // in cents
  count: number;
}

export interface ExpenseSummaryResponse {
  totalSpent: number; // in cents
  categoryBreakdown: ExpenseCategorySummary[];
  monthlyTrend: MonthlySpendingSummary[];
}
