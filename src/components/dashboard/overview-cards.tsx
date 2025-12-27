
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Transaction, Account } from '@/lib/types';
import { useUser } from '@/firebase';
import { isSameMonth, isSameYear } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TransactionType } from '@/lib/types';

type Period = 'currentMonth' | 'currentYear' | 'overall';

export default function OverviewCards({ transactions, accounts }: { transactions: Transaction[], accounts: Account[] }) {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>('currentMonth');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (period === 'currentMonth') {
      return transactions.filter(t => isSameMonth(new Date(t.date), now));
    }
    if (period === 'currentYear') {
      return transactions.filter(t => isSameYear(new Date(t.date), now));
    }
    return transactions;
  }, [transactions, period]);

  const { income, expenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;

    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.Income && t.category !== 'Transfer') {
        income += t.amount;
      } else if (t.type === TransactionType.Expense) {
        expenses += Math.abs(t.amount);
      }
    });

    return { income, expenses };
  }, [filteredTransactions]);

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
                    <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="currentMonth">This Month</SelectItem>
                    <SelectItem value="currentYear">This Year</SelectItem>
                    <SelectItem value="overall">Overall</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <Link href={`/settings/reports?period=${period}`}>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <div className="text-muted-foreground">Income</div>
                        <div className="font-medium text-green-500">{formatCurrency(income)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Expenses</div>
                        <div className="font-medium text-red-500">{formatCurrency(expenses)}</div>
                    </div>
                </div>
            </CardContent>
        </Link>
      </Card>
    </>
  );
}
