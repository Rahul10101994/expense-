export type TransactionCategory = 'Income' | 'Food' | 'Shopping' | 'Housing' | 'Transportation' | 'Utilities' | 'Entertainment' | 'Health' | 'Investment' | 'Other';

export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
  Investment = 'investment'
}

export type Transaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  type: TransactionType;
};

export type Budget = {
  category: TransactionCategory;
  limit: number;
  spent: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
};
