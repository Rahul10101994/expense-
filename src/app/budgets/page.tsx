
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Transaction, Budget, Account } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function BudgetsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const currentMonth = useMemo(() => new Date(), []);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);
    
    useEffect(() => {
        if (!user || !firestore || accountsLoading) return;
        if (!accounts || accounts.length === 0) {
            setTransactions([]);
            setTransactionsLoading(false);
            return;
        }
        
        const fetchTransactions = async () => {
            setTransactionsLoading(true);
            const allTransactions: Transaction[] = [];
            
            const monthStart = startOfMonth(currentMonth).toISOString();
            const monthEnd = endOfMonth(currentMonth).toISOString();

            for (const account of accounts) {
                const transactionsQuery = query(
                    collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`),
                    where('date', '>=', monthStart),
                    where('date', '<=', monthEnd)
                );
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.forEach(doc => {
                    allTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
                });
            }
            setTransactions(allTransactions);
            setTransactionsLoading(false);
        };

        fetchTransactions();
    }, [user, firestore, accounts, accountsLoading, currentMonth]);

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


    const budgets: Budget[] = useMemo(() => {
        if (!savedBudgets) return [];

        const spendingByCategory = (transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => {
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


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    if (budgetsLoading || transactionsLoading || accountsLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between p-2">
                    <div>
                        <CardTitle>Budgets</CardTitle>
                        <CardDescription>Create and manage your monthly budgets.</CardDescription>
                    </div>
                    <Link href="/budget-planner">
                      <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Budget
                      </Button>
                    </Link>
                </CardHeader>
            </Card>

            <BudgetGoals budgets={budgets} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <SpendingBreakdownChart transactions={transactions || []} />
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Budget by Category</CardTitle>
                        <CardDescription>A detailed look at your spending against your budgets for {format(currentMonth, 'MMMM yyyy')}.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 md:grid-cols-2">
                        {budgets.length === 0 && (
                            <div className="text-center text-muted-foreground col-span-full py-8">
                                <p>You haven't set any budgets for this month.</p>
                                <Link href="/budget-planner" className="text-primary hover:underline">Set a budget now</Link>
                            </div>
                        )}
                        {budgets.map((budget) => {
                            const progress = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
                            const isOverBudget = progress >= 100;

                            return (
                                <Card key={budget.id} className="p-3">
                                    <div className="flex items-center justify-between gap-2 text-xs mb-2">
                                        <div className="flex items-center gap-2 font-medium">
                                            <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate">{budget.category}</span>
                                        </div>
                                        <div className="text-muted-foreground shrink-0">
                                            {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress value={progress} className={cn("h-2 flex-1", { '[&>div]:bg-destructive': isOverBudget })} />
                                        <span className={cn("text-xs font-medium w-12 text-right", isOverBudget ? "text-red-500" : "text-muted-foreground")}>
                                            {isOverBudget ? 'Over' : `${Math.round(100 - progress)}%`}
                                        </span>
                                    </div>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
