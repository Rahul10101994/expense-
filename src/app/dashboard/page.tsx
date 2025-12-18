
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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Transaction, Budget, Goal, Account } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { useMemo, useEffect, useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const currentMonth = useMemo(() => new Date(), []);
    
    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [allTransactionsLoading, setAllTransactionsLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore || accountsLoading) return;
        if (!accounts) {
            setAllTransactions([]);
            setAllTransactionsLoading(false);
            return;
        }

        const fetchAllTransactions = async () => {
            setAllTransactionsLoading(true);
            const transactions: Transaction[] = [];
            for (const account of accounts) {
                const transactionsColRef = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
                const transactionsSnapshot = await getDocs(transactionsColRef);
                transactionsSnapshot.forEach(doc => {
                    transactions.push({ id: doc.id, ...doc.data() } as Transaction);
                });
            }
            setAllTransactions(transactions);
            setAllTransactionsLoading(false);
        };

        fetchAllTransactions();
    }, [user, firestore, accounts, accountsLoading]);

    const recentTransactionsQuery = useMemoFirebase(() => {
        if (!user || !accounts || accounts.length === 0) return null;
        // This is a simplification to get real-time updates. 
        // For a full app, you'd need a more complex solution to query across all accounts.
        const mostRecentAccount = accounts[0];
        return query(
            collection(firestore, `users/${user.uid}/accounts/${mostRecentAccount.id}/transactions`),
            orderBy('date', 'desc'),
            limit(10)
        );
    }, [firestore, user, accounts]);

    const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(recentTransactionsQuery);


    const budgetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        const monthStart = startOfMonth(currentMonth).toISOString();
        const monthEnd = endOfMonth(currentMonth).toISOString();
        return query(
            collection(firestore, `users/${user.uid}/budgets`),
            where('month', '>=', monthStart),
            where('month', '<=', monthEnd)
        );
    }, [firestore, user, currentMonth]);
    
    const { data: savedBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

     const goalsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [firestore, user]);

    const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsQuery);
    
    const budgets: Budget[] = useMemo(() => {
        if (!savedBudgets || !allTransactions) return [];

        const spendingByCategory = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
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

    }, [savedBudgets, allTransactions]);
    

    if (transactionsLoading || accountsLoading || budgetsLoading || goalsLoading || allTransactionsLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    const financialData = {
        transactions: allTransactions || [],
        accounts: accounts || [],
        budgets,
        goals: goals || [],
    };

    const recentTransactionsData = transactions || [];

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
          <RecentTransactions transactions={recentTransactionsData} />
        </Card>
        <div className="col-span-1 lg:col-span-3 space-y-4">
            <AiInsights transactions={financialData.transactions} goals={financialData.goals} />
        </div>
      </div>
    </div>
  );
}
