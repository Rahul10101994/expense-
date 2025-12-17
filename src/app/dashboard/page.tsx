
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
import type { Transaction, Budget, Goal, Account } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { useMemo } from 'react';
import { startOfMonth } from 'date-fns';


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const currentMonth = useMemo(() => new Date(), []);

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/accounts/default/transactions`));
    }, [firestore, user]);
    
    const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
    
    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);

    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

    const budgetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        const monthStart = startOfMonth(currentMonth);
        return query(
            collection(firestore, `users/${user.uid}/budgets`),
            where('month', '>=', monthStart.toISOString())
        );
    }, [firestore, user, currentMonth]);
    
    const { data: savedBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

     const goalsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [firestore, user]);

    const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsQuery);
    
    const budgets: Budget[] = useMemo(() => {
        if (!savedBudgets || !transactions) return [];

        const spendingByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            const categoryKey = t.category || 'Other';
            acc[categoryKey] = (acc[categoryKey] || 0) + Math.abs(t.amount);
            return acc;
        }, {} as Record<string, number>);
        
        return savedBudgets
            .filter(budget => budget.amount > 0)
            .map(budget => ({
                id: budget.id,
                category: budget.categoryId as Transaction['category'],
                limit: budget.amount,
                spent: spendingByCategory[budget.categoryId] || 0,
                month: budget.month
        }));

    }, [savedBudgets, transactions]);
    

    if (transactionsLoading || accountsLoading || budgetsLoading || goalsLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    const financialData = {
        transactions: transactions || [],
        accounts: accounts || [],
        budgets,
        goals: goals || [],
    };

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCards transactions={financialData.transactions} accounts={financialData.accounts} />
      </div>
       <Link href="/budgets" className="mt-4 block">
          <BudgetGoals budgets={financialData.budgets} />
      </Link>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-5">
          <IncomeExpenseChart transactions={financialData.transactions} />
        </Card>
        <Card className="col-span-1 lg:col-span-2">
          <SpendingBreakdownChart transactions={financialData.transactions} />
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 h-auto lg:h-[440px]">
          <RecentTransactions transactions={financialData.transactions} />
        </Card>
        <div className="col-span-1 lg:col-span-3 space-y-4">
            <AiInsights transactions={financialData.transactions} goals={financialData.goals} />
        </div>
      </div>
    </div>
  );
}
