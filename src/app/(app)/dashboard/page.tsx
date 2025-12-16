'use client';

import { Card } from '@/components/ui/card';
import OverviewCards from '@/components/dashboard/overview-cards';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import RecentTransactions from '@/components/dashboard/recent-transactions';
import BudgetGoals from '@/components/dashboard/budget-goals';
import AiInsights from '@/components/dashboard/ai-insights';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import type { Transaction, Budget, Goal } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { useMemo } from 'react';


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/accounts/default/transactions`));
    }, [firestore, user]);
    
    const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
    
    const budgets = useMemo(() => {
        if (!transactions) return [];

        const spendingByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            const categoryKey = t.category || 'Other';
            acc[categoryKey] = (acc[categoryKey] || 0) + Math.abs(t.amount);
            return acc;
        }, {} as Record<string, number>);

        // Placeholder for budget limits - in a real app, this would come from Firestore
        const budgetLimits: Record<string, number> = {
            'Food': 500,
            'Shopping': 300,
            'Transportation': 150,
            'Entertainment': 100,
            'Health': 100,
            'Other': 100,
            'Housing': 1500,
            'Utilities': 100,
        };

        return Object.keys(budgetLimits).map(category => ({
            id: category,
            category: category as Transaction['category'],
            limit: budgetLimits[category],
            spent: spendingByCategory[category] || 0,
            month: new Date().toISOString()
        }));
    }, [transactions]);
    
    // Using mock data for goals for now
    const goals: Goal[] = [
      { id: '1', name: 'Vacation to Hawaii', targetAmount: 5000, currentAmount: 1200, deadline: '2025-06-01' },
      { id: '2', name: 'House Down Payment', targetAmount: 50000, currentAmount: 15000, deadline: '2027-01-01' },
      { id: '3', name: 'New Laptop', targetAmount: 2000, currentAmount: 1800, deadline: '2024-12-01' },
    ];

    if (transactionsLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    const financialData = {
        transactions: transactions || [],
        budgets,
        goals,
    };

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCards transactions={financialData.transactions} />
      </div>
       <Link href="/budgets" className="mt-4 block">
          <BudgetGoals budgets={financialData.budgets} />
      </Link>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-12 lg:col-span-5">
          <IncomeExpenseChart transactions={financialData.transactions} />
        </Card>
        <Card className="col-span-12 lg:col-span-2">
          <SpendingBreakdownChart transactions={financialData.transactions} />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-12 lg:col-span-4 h-[440px]">
          <RecentTransactions transactions={financialData.transactions} />
        </Card>
        <div className="col-span-12 lg:col-span-3 space-y-4">
            <AiInsights transactions={financialData.transactions} goals={financialData.goals} />
        </div>
      </div>
    </div>
  );
}
