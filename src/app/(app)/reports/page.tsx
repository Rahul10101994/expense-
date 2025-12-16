
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction, Budget, TransactionCategory } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { isSameMonth, isSameYear } from 'date-fns';
import { ArrowDown, ArrowUp, PiggyBank } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';

export default function ReportsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const period = searchParams.get('period') || 'overall';

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts/default/transactions`);
    }, [firestore, user]);

    const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        const now = new Date();
        if (period === 'currentMonth') {
            return transactions.filter(t => isSameMonth(new Date(t.date), now));
        }
        if (period === 'currentYear') {
            return transactions.filter(t => isSameYear(new Date(t.date), now));
        }
        return transactions;
    }, [transactions, period]);

    const { income, expenses, savings } = useMemo(() => {
        let income = 0;
        let expenses = 0;
        filteredTransactions.forEach(t => {
            if (t.type === 'income') {
                income += t.amount;
            } else if (t.type === 'expense') {
                expenses += Math.abs(t.amount);
            }
        });
        const savings = income - expenses;
        return { income, expenses, savings };
    }, [filteredTransactions]);
    
    const budgets: Budget[] = useMemo(() => {
        if (!filteredTransactions) return [];

        const spendingByCategory = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
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
            category: category as TransactionCategory,
            limit: budgetLimits[category],
            spent: spendingByCategory[category] || 0,
        }));
    }, [filteredTransactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="py-2">
                    <CardTitle className="text-sm">Financial Reports</CardTitle>
                    <CardDescription>Detailed analysis of your financial activity for: <span className="font-semibold capitalize">{period === 'currentMonth' ? 'This Month' : period === 'currentYear' ? 'This Year' : 'Overall'}</span></CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(income)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold text-red-500">{formatCurrency(expenses)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
                        <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold text-primary">{formatCurrency(savings)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               <Card>
                    <IncomeExpenseChart transactions={filteredTransactions} />
                </Card>
                <Card>
                    <SpendingBreakdownChart transactions={filteredTransactions} />
                </Card>
            </div>
            
            <BudgetGoals budgets={budgets} />

            <Card>
                <CardHeader className="py-3">
                    <CardTitle>Budget Breakdown</CardTitle>
                    <CardDescription>Your spending progress for each category for the selected period.</CardDescription>
                </CardHeader>
            </Card>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget) => {
                    const progress = (budget.spent / budget.limit) * 100;
                    const remaining = budget.limit - budget.spent;
                    return (
                        <Card key={budget.category}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                    {budget.category}
                                </CardTitle>
                                <span className="text-sm text-muted-foreground">
                                    {formatCurrency(budget.limit)}
                                </span>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="text-2xl font-bold">{formatCurrency(budget.spent)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(remaining)} remaining
                                </p>
                                <Progress value={progress} className="mt-2 h-2" />
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
