
'use client';

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Transaction, Budget } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';


export default function BudgetsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        // In a multi-account setup, we would query all account subcollections.
        // For simplicity, we are assuming a single account structure for now.
        return query(collection(firestore, `users/${user.uid}/accounts/default/transactions`));
    }, [firestore, user]);

    const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

    const budgets: Budget[] = useMemo(() => {
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
            'Income': 0,
            'Investment': 0,
        };

        return Object.keys(budgetLimits)
            .filter(category => budgetLimits[category] > 0) // Only show expense categories with budgets
            .map(category => ({
                category: category as Transaction['category'],
                limit: budgetLimits[category],
                spent: spendingByCategory[category] || 0,
        }));
    }, [transactions]);


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <BudgetGoals budgets={budgets} />
            <Card>
                <SpendingBreakdownChart transactions={transactions || []} />
            </Card>
            <Card>
                <CardHeader className="p-2 pt-2">
                    <CardTitle className="text-sm font-medium">Budget by Category</CardTitle>
                </CardHeader>
            </Card>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget) => {
                    const progress = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
                    const isOverBudget = progress >= 100;

                    return (
                        <Card key={budget.category} className="p-3">
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
            </div>
        </div>
    );
}
