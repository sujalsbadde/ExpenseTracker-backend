import { CategoryDTO } from './category';

export type BudgetPeriod = 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface BudgetDTO {
  id: string;
  // Amount in integer cents
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  userId: string;
  categoryId?: string | null;
  category?: CategoryDTO | null;
  // Computed utilization fields
  currentSpent?: number; // in cents
  percentageUsed?: number;
  remainingAmount?: number; // in cents
  isOverBudget?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  // Amount in integer cents
  amount: number;
  period?: BudgetPeriod;
  startDate: string;
  endDate: string;
  categoryId?: string; // Optional: if omitted, represents total spend budget
}

export interface UpdateBudgetRequest {
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}
