

export type TransactionCategory = 'Income' | 'Food' | 'Shopping' | 'Housing' | 'Transportation' | 'Utilities' | 'Entertainment' | 'Health' | 'Investment' | 'Other' | 'Transfer' | 'Reconciliation';

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
  Investment = 'investment',
  Transfer = 'transfer',
  Reconciliation = 'reconciliation'
}

export type Transaction = {
  id: string;
  userId: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  type: TransactionType;
  expenseType?: 'need' | 'want';
};

export type Account = {
    id: string;
    userId: string;
    name: string;
    type: 'checking' | 'savings' | 'investment' | 'credit' | 'other';
    balance: number;
}

export type Budget = {
  id: string;
  category: TransactionCategory;
  limit: number;
  spent: number;
  month: string;
  amount?: number;
  categoryId?: string;
  type?: 'expense' | 'investment';
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  type: 'saving' | 'investment' | 'need_spending' | 'want_spending' | 'long_term';
  period: 'monthly' | 'yearly' | 'long_term';
};

export type Category = {
    id: string;
    name: string;
    userId: string;
    type: 'income' | 'expense' | 'investment';
}

    