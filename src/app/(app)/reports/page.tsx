
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction, Budget, TransactionCategory } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { isSameMonth, isSameYear, startOfMonth, endOfMonth, getYear, getMonth, format } from 'date-fns';
import { ArrowDown, ArrowUp, PiggyBank, Download } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type Period = 'currentMonth' | 'currentYear' | 'overall' | 'custom';

export default function ReportsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [period, setPeriod] = useState<Period>(searchParams.get('period') as Period || 'currentMonth');
    const [selectedYear, setSelectedYear] = useState<number>(searchParams.get('year') ? parseInt(searchParams.get('year')!) : getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(searchParams.get('month') ? parseInt(searchParams.get('month')!) : getMonth(new Date()));
    
    const handleFilterChange = (type: 'period' | 'year' | 'month', value: string) => {
        const params = new URLSearchParams(searchParams);
        if (type === 'period') {
            setPeriod(value as Period);
            params.set('period', value);
            if (value !== 'custom') {
                params.delete('year');
                params.delete('month');
            } else {
                 params.set('year', selectedYear.toString());
                 params.set('month', selectedMonth.toString());
            }
        }
        if (type === 'year') {
            const year = parseInt(value);
            setSelectedYear(year);
            setPeriod('custom');
            params.set('period', 'custom');
            params.set('year', value);
            params.set('month', selectedMonth.toString());
        }
        if (type === 'month') {
            const month = parseInt(value);
            setSelectedMonth(month);
            setPeriod('custom');
            params.set('period', 'custom');
            params.set('year', selectedYear.toString());
            params.set('month', value);
        }
        router.push(`/reports?${params.toString()}`);
    };

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
        if (period === 'custom') {
            return transactions.filter(t => {
                const date = new Date(t.date);
                return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
            });
        }
        return transactions;
    }, [transactions, period, selectedYear, selectedMonth]);

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
            category: category as TransactionCategory,
            limit: budgetLimits[category],
            spent: spendingByCategory[category] || 0,
            month: new Date().toISOString()
        }));
    }, [filteredTransactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    
    const getReportTitle = () => {
        if (period === 'currentMonth') return 'This Month';
        if (period === 'currentYear') return 'This Year';
        if (period === 'custom') return format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
        return 'Overall';
    }
    
    const yearOptions = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), 'MMMM') }));

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
                <CardHeader className="py-2.5">
                    <CardTitle className="text-base">Financial Reports</CardTitle>
                    <CardDescription>Detailed analysis of your financial activity for: <span className="font-semibold capitalize">{getReportTitle()}</span></CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0 flex flex-wrap gap-2 items-center">
                     <Select value={period} onValueChange={(v) => handleFilterChange('period', v)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="currentMonth">This Month</SelectItem>
                            <SelectItem value="currentYear">This Year</SelectItem>
                            <SelectItem value="overall">Overall</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    {period === 'custom' && (
                        <>
                            <Select value={selectedYear.toString()} onValueChange={(v) => handleFilterChange('year', v)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedMonth.toString()} onValueChange={(v) => handleFilterChange('month', v)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="p-1">
                        <div className="text-lg font-bold text-green-500">{formatCurrency(income)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="p-1">
                        <div className="text-lg font-bold text-red-500">{formatCurrency(expenses)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1">
                        <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
                        <PiggyBank className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="p-1">
                        <div className="text-lg font-bold text-primary">{formatCurrency(savings)}</div>
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
                <CardHeader className="py-2">
                    <CardTitle className="text-xs">Budget Breakdown</CardTitle>
                </CardHeader>
            </Card>
             <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {budgets.filter(b => b.limit > 0).map((budget) => {
                    const progress = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
                    const remaining = budget.limit - budget.spent;
                    return (
                        <Card key={budget.category}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pt-1">
                                <CardTitle className="text-xs font-medium flex items-center gap-2">
                                    <CategoryIcon category={budget.category} className="h-3 w-3 text-muted-foreground" />
                                    {budget.category}
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                    {formatCurrency(budget.limit)}
                                </span>
                            </CardHeader>
                            <CardContent className="p-2 pt-0">
                                <div className="text-base font-bold">{formatCurrency(budget.spent)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(remaining)} remaining
                                </p>
                                <Progress value={progress} className="mt-1 h-1.5" />
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );

    

    

