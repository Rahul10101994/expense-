'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { isSameMonth, isSameYear } from 'date-fns';
import { ArrowDown, ArrowUp, PiggyBank } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

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
                <CardHeader>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>Detailed analysis of your financial activity for: <span className="font-semibold capitalize">{period === 'currentMonth' ? 'This Month' : period === 'currentYear' ? 'This Year' : 'Overall'}</span></CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(income)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatCurrency(expenses)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
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
        </div>
    );
}
