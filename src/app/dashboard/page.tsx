
'use client';

import { Card } from '@/components/ui/card';
import OverviewCards from '@/components/dashboard/overview-cards';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import RecentTransactions from '@/components/dashboard/recent-transactions';
import BudgetGoals from '@/components/dashboard/budget-goals';
import AiInsights from '@/components/dashboard/ai-insights';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';

import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Transaction, Budget, Goal, Account } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const currentMonth = useMemo(() => new Date(), []);
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);

        const fetchedAccounts: Account[] = [];
        const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
        accountsSnapshot.forEach(doc => {
            fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
        });
        
        const fetchedTransactions: Transaction[] = [];
        for (const account of fetchedAccounts) {
            const transactionsColRef = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
            const transactionsQuery = query(transactionsColRef, orderBy('date', 'desc'));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => {
                fetchedTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
            });
        }
        
        fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Recalculate account balances based on all transactions
        const updatedAccounts = fetchedAccounts.map(account => {
            const accountTransactions = fetchedTransactions.filter(t => t.accountId === account.id);
            const currentBalance = accountTransactions.reduce((acc, t) => {
                // For credit cards, expenses increase the balance (debt) and payments (income) decrease it.
                if (account.type === 'credit') {
                    if (t.type === 'expense') return acc + Math.abs(t.amount);
                    if (t.type === 'income') return acc - Math.abs(t.amount); // Payments to card
                }
                // For other accounts, income increases balance, expenses decrease it.
                return acc + t.amount;
            }, 0);
            return { ...account, balance: currentBalance };
        });

        setAccounts(updatedAccounts);
        setTransactions(fetchedTransactions);
        setIsLoading(false);
    }, [user, firestore]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const budgetsQuery = useMemoFirebase(() => {
        if (!user) return null;
        const monthStart = startOfMonth(currentMonth).toISOString();
        return query(
            collection(firestore, `users/${user.uid}/budgets`),
            where('month', '==', monthStart),
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
            .filter(budget => budget.amount && budget.amount > 0)
            .map(budget => ({
                id: budget.id,
                category: budget.categoryId as Transaction['category'],
                limit: budget.amount || 0,
                spent: spendingByCategory[budget.categoryId!] || 0,
                month: budget.month
        }));

    }, [savedBudgets, transactions]);
    

    if (isLoading || budgetsLoading || goalsLoading) {
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
          <RecentTransactions transactions={financialData.transactions} onTransactionAdded={fetchAllData}/>
        </Card>
        <div className="col-span-1 lg:col-span-3 space-y-4">
            <AiInsights transactions={financialData.transactions} goals={financialData.goals} />
        </div>
      </div>
    </div>
  );
}

    