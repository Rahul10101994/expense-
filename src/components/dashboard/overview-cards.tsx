
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Transaction, Account, Budget } from '@/lib/types';
import { useUser } from '@/firebase';
import { isSameMonth, isSameYear, format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TransactionType } from '@/lib/types';

type Period = 'currentMonth' | 'currentYear' | 'overall';

export default function OverviewCards({ transactions, accounts, budgets }: { transactions: Transaction[], accounts: Account[], budgets: Budget[] }) {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>('currentMonth');

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

  const { income, expenses, investments, savings, savingsRate } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let investments = 0;

    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.Income && t.category !== 'Transfer' && t.category !== 'Reconciliation') {
        income += t.amount;
      } else if (t.type === TransactionType.Expense) {
        expenses += t.amount;
      } else if (t.type === TransactionType.Investment) {
        investments += t.amount;
      }
    });
    
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, investments, savings, savingsRate };
  }, [filteredTransactions]);

  const { expenseBudget, investmentBudget, expenseProgress, investmentProgress } = useMemo(() => {
    if (!budgets || period !== 'currentMonth') return { expenseBudget: 0, investmentBudget: 0, expenseProgress: 0, investmentProgress: 0 };
    
    const expenseBudgetTotal = budgets.filter(b => b.type === 'expense').reduce((sum, b) => sum + b.limit, 0);
    const investmentBudgetTotal = budgets.filter(b => b.type === 'investment').reduce((sum, b) => sum + b.limit, 0);
    
    const expenseProgress = expenseBudgetTotal > 0 ? (expenses / expenseBudgetTotal) * 100 : 0;
    const investmentProgress = investmentBudgetTotal > 0 ? (investments / investmentBudgetTotal) * 100 : 0;

    return { expenseBudget: expenseBudgetTotal, investmentBudget: investmentBudgetTotal, expenseProgress, investmentProgress };
  }, [budgets, expenses, investments, period]);

  const totalBalance = useMemo(() => {
    if (!accounts) return 0;
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };
  
  const getDisplayName = () => {
    if (user?.isAnonymous) return "Anonymous User";
    return user?.displayName || user?.email || "Welcome Back!";
  }

  const periodDisplay: Record<Period, string> = {
    currentMonth: format(new Date(), 'MMMM yyyy'),
    currentYear: 'This Year',
    overall: 'Overall',
  };

  return (
    <>
      <Card className={cn("col-span-full", "bg-secondary")}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">{getDisplayName()}</CardTitle>
               <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            </div>
            <div className="w-[140px]">
                <Select onValueChange={(value: Period) => setPeriod(value)} defaultValue={period}>
                    <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue>{periodDisplay[period]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="currentMonth">{periodDisplay.currentMonth}</SelectItem>
                    <SelectItem value="currentYear">This Year</SelectItem>
                    <SelectItem value="overall">Overall</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <Link href={`/settings/reports?period=${period}`}>
            <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                        <div className="text-muted-foreground">Income</div>
                        <div className="font-medium text-green-500">{formatCurrency(income)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Expenses</div>
                         <div className="flex items-baseline gap-1">
                            <div className="font-medium text-red-500">{formatCurrency(expenses)}</div>
                             {period === 'currentMonth' && expenseBudget > 0 && (
                                <div className="text-muted-foreground">
                                    ({expenseProgress.toFixed(0)}%)
                                </div>
                            )}
                        </div>
                        {period === 'currentMonth' && expenseBudget > 0 && <Progress value={expenseProgress} className="h-1 mt-1" />}
                    </div>
                    <div>
                        <div className="text-muted-foreground">Investments</div>
                        <div className="flex items-baseline gap-1">
                            <div className="font-medium text-blue-500">{formatCurrency(investments)}</div>
                            {period === 'currentMonth' && investmentBudget > 0 && (
                                <div className="text-muted-foreground">
                                    ({investmentProgress.toFixed(0)}%)
                                </div>
                            )}
                        </div>
                        {period === 'currentMonth' && investmentBudget > 0 && <Progress value={investmentProgress} className="h-1 mt-1" />}
                    </div>
                    <div>
                        <div className="text-muted-foreground">Savings</div>
                        <div className="flex items-baseline gap-1">
                            <div className={cn("font-medium", savings >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(savings)}</div>
                            {income > 0 && (
                                <div className="text-muted-foreground">
                                    ({savingsRate.toFixed(0)}%)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Link>
      </Card>
    </>
  );
}
