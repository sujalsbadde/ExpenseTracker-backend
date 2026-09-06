export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringRuleDTO {
  id: string;
  amount: number; // in cents
  description: string;
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 1 month, every 2 weeks
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  lastGeneratedDate?: string | null;
  isActive: boolean;
  categoryId: string;
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';
  notes?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringRuleRequest {
  amount: number; // in cents
  description: string;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: string;
  endDate?: string;
  categoryId: string;
  paymentMethod?: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';
  notes?: string;
}

export interface UpdateRecurringRuleRequest {
  amount?: number;
  description?: string;
  frequency?: RecurrenceFrequency;
  interval?: number;
  endDate?: string | null;
  isActive?: boolean;
  categoryId?: string;
  paymentMethod?: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'OTHER';
  notes?: string | null;
}
