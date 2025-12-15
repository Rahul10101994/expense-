import { Transaction, Budget, Goal, TransactionCategory } from './types';

export const transactions: Transaction[] = [
  { id: '1', date: '2024-07-26', description: 'Salary', amount: 5000, category: 'Income', type: 'income' },
  { id: '2', date: '2024-07-26', description: 'Groceries', amount: -150.75, category: 'Food', type: 'expense' },
  { id: '3', date: '2024-07-25', description: 'New Shoes', amount: -120, category: 'Shopping', type: 'expense' },
  { id: '4', date: '2024-07-25', description: 'Stock Purchase - AAPL', amount: -1000, category: 'Investment', type: 'investment' },
  { id: '5', date: '2024-07-24', description: 'Gasoline', amount: -45.50, category: 'Transportation', type: 'expense' },
  { id: '6', date: '2024-07-23', description: 'Dinner with friends', amount: -80, category: 'Food', type: 'expense' },
  { id: '7', date: '2024-07-22', description: 'Movie tickets', amount: -30, category: 'Entertainment', type: 'expense' },
  { id: '8', date: '2024-07-21', description: 'Freelance Gig', amount: 750, category: 'Income', type: 'income' },
  { id: '9', date: '2024-07-20', description: 'Rent', amount: -1500, category: 'Housing', type: 'expense' },
  { id: '10', date: '2024-07-19', description: 'Electricity Bill', amount: -75, category: 'Utilities', type: 'expense' },
  { id: '11', date: '2024-07-18', description: 'Pharmacy', amount: -25.30, category: 'Health', type: 'expense' },
  { id: '12', date: '2024-07-17', description: 'Coffee', amount: -5.50, category: 'Food', type: 'expense' },
];

export const budgets: Budget[] = [
  { category: 'Food', limit: 500, spent: 236.25 },
  { category: 'Shopping', limit: 300, spent: 120 },
  { category: 'Transportation', limit: 150, spent: 45.50 },
  { category: 'Entertainment', limit: 100, spent: 30 },
  { category: 'Health', limit: 100, spent: 25.30 },
  { category: 'Other', limit: 100, spent: 0 },
];

export const goals: Goal[] = [
  { id: '1', name: 'Vacation to Hawaii', targetAmount: 5000, currentAmount: 1200, deadline: '2025-06-01' },
  { id: '2', name: 'House Down Payment', targetAmount: 50000, currentAmount: 15000, deadline: '2027-01-01' },
  { id: '3', name: 'New Laptop', targetAmount: 2000, currentAmount: 1800, deadline: '2024-12-01' },
];

export const categories: TransactionCategory[] = [
  'Income',
  'Food',
  'Shopping',
  'Housing',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Health',
  'Investment',
  'Other',
];
