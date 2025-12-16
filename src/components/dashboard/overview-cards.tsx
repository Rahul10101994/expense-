
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
import { DollarSign, ArrowUp, ArrowDown, PiggyBank, User as UserIcon } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import { useUser } from '@/firebase';
import { isSameMonth, isSameYear, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import Link from 'next/link';

type Period = 'currentMonth' | 'currentYear' | 'overall';

export default function OverviewCards({ transactions }: { transactions: Transaction[] }) {
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

  const { balance, income, expenses, totalInvestments } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let totalInvestments = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
      } else if (t.type === 'investment') {
        totalInvestments += t.amount;
      }
    });

    const balance = income + expenses; // Investments are not part of this balance
    return { balance, income, expenses, totalInvestments };
  }, [filteredTransactions]);
  
  const allTimeTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestments = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
      } else if (t.type === 'investment') {
        totalInvestments += t.amount;
      }
    });
    return { totalIncome, totalExpenses, totalInvestments };
  }, [transactions]);


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
      <Card className="col-span-full md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{getDisplayName()}</CardTitle>
        </CardHeader>
        <Link href={`/reports?period=${period}`}>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className='flex flex-col bg-gray-100 dark:bg-gray-800 p-2 rounded-md'>
                        <span className="text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(income)}</span>
                    </div>
                    <div className='flex flex-col items-start bg-gray-100 dark:bg-gray-800 p-2 rounded-md'>
                         <span className="text-gray-600 dark:text-gray-300">Expenses</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(Math.abs(expenses))}</span>
                    </div>
              </div>
            </CardContent>
        </Link>
      </Card>
      <Card className="col-span-full md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Period</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </>
  );
}
