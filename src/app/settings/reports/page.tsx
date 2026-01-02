
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Transaction, Budget, Category, Account } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, getYear, getMonth, format } from 'date-fns';
import { ArrowDown, ArrowUp, PiggyBank, Download, ArrowLeft, TrendingUp, TrendingDown, Wallet, HandCoins, AreaChart } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NeedsWantsChart from '@/components/dashboard/needs-wants-chart';
import { TransactionType } from '@/lib/types';
import NeedsWantsSummary from '@/components/dashboard/needs-wants-summary';

type Period = 'currentMonth' | 'currentYear' | 'overall' | 'custom';

export default function ReportsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [period, setPeriod] = useState<Period>(searchParams.get('period') as Period || 'currentMonth');
    const [selectedYear, setSelectedYear] = useState<number>(searchParams.get('year') ? parseInt(searchParams.get('year')!) : getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(searchParams.get('month') ? parseInt(searchParams.get('month')!) : getMonth(new Date()));
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

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
        router.push(`/settings/reports?${params.toString()}`);
    };

    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        let start, end;
        if (period === 'currentMonth') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else if (period === 'currentYear') {
            start = new Date(getYear(now), 0, 1);
            end = new Date(getYear(now), 11, 31, 23, 59, 59);
        } else if (period === 'custom') {
            start = startOfMonth(new Date(selectedYear, selectedMonth));
            end = endOfMonth(new Date(selectedYear, selectedMonth));
        } else { // 'overall'
            start = null; // No start date for overall
            end = null; // No end date for overall
        }
        return { startDate: start, endDate: end };
    }, [period, selectedYear, selectedMonth]);

     useEffect(() => {
        if (!user || !firestore || accountsLoading) return;
        if (!accounts) {
            setTransactions([]);
            setTransactionsLoading(false);
            return;
        }

        const fetchTransactions = async () => {
            setTransactionsLoading(true);
            const allTransactions: Transaction[] = [];

            for (const account of accounts) {
                let transactionsQuery;
                if (startDate && endDate) {
                    transactionsQuery = query(
                        collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`),
                        where('date', '>=', startDate.toISOString()),
                        where('date', '<=', endDate.toISOString())
                    );
                } else {
                    // overall, so no date filter
                    transactionsQuery = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
                }
                
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.forEach(doc => {
                    allTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
                });
            }
            setTransactions(allTransactions);
            setTransactionsLoading(false);
        };

        fetchTransactions();
    }, [user, firestore, accounts, accountsLoading, startDate, endDate]);

    const { income, expenses, investments, savings } = useMemo(() => {
        let income = 0;
        let expenses = 0;
        let investments = 0;
        transactions.forEach(t => {
            if (t.type === TransactionType.Income && t.category !== 'Transfer') {
                income += t.amount;
            } else if (t.type === TransactionType.Expense) {
                expenses += t.amount;
            } else if (t.type === TransactionType.Investment) {
                investments += t.amount;
            }
        });
        const savings = income - expenses - investments;
        return { income, expenses, investments, savings };
    }, [transactions]);

    const { needs, wants } = useMemo(() => {
        let needs = 0;
        let wants = 0;
        transactions.filter(t => t.type === 'expense').forEach(t => {
            if (t.expenseType === 'need') {
                needs += t.amount;
            } else if (t.expenseType === 'want') {
                wants += t.amount;
            }
        });
        return { needs, wants };
    }, [transactions]);

    const budgetsQuery = useMemoFirebase(() => {
        if (!user || !startDate || !endDate) return null;
        return query(
            collection(firestore, `users/${user.uid}/budgets`),
            where('month', '>=', startDate.toISOString()),
            where('month', '<=', endDate.toISOString())
        );
    }, [firestore, user, startDate, endDate]);
    
    const { data: savedBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
    
    const budgets: Budget[] = useMemo(() => {
        if (!savedBudgets || !transactions) return [];

        const spendingByCategory = transactions.filter(t => t.type === TransactionType.Expense || t.type === TransactionType.Investment).reduce((acc, t) => {
            const categoryKey = t.category || 'Other';
            acc[categoryKey] = (acc[categoryKey] || 0) + t.amount;
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

    if (transactionsLoading || accountsLoading || budgetsLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="py-2.5 flex-row items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft />
                        </Button>
                    </Link>
                    <div>
                        <CardTitle className="text-base">Financial Reports</CardTitle>
                        <CardDescription>Detailed analysis for: <span className="font-semibold capitalize">{getReportTitle()}</span></CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-2 pt-0 flex flex-wrap gap-2 items-center">
                     <Select value={period} onValueChange={(v) => handleFilterChange('period', v)}>
                        <SelectTrigger className="h-8 text-xs w-full sm:w-auto flex-1">
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
                                <SelectTrigger className="h-8 text-xs w-full sm:w-auto flex-1">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedMonth.toString()} onValueChange={(v) => handleFilterChange('month', v)}>
                                <SelectTrigger className="h-8 text-xs w-full sm:w-auto flex-1">
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
                        <AreaChart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-1">
                        <div className="text-lg font-bold text-blue-500">{formatCurrency(investments)}</div>
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

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
               <Card className="lg:col-span-5">
                    <IncomeExpenseChart transactions={transactions} />
                </Card>
                 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                    <Card>
                        <SpendingBreakdownChart transactions={transactions} />
                    </Card>
                    <NeedsWantsSummary transactions={transactions} />
                </div>
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
                        <Card key={budget.id}>
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
}
