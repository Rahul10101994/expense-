'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Budget } from '@/lib/types';
import { useMemo } from 'react';

export default function BudgetGoals({ budgets }: { budgets: (Budget & { type?: 'expense' | 'investment' })[] }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const { totalBudget, totalSpent, totalLeft, progress } = useMemo(() => {
        const totalBudget = budgets.reduce((acc, budget) => acc + budget.limit, 0);
        const totalSpent = budgets.reduce((acc, budget) => acc + budget.spent, 0);
        const totalLeft = totalBudget - totalSpent;
        const progress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        return { totalBudget, totalSpent, totalLeft, progress };
    }, [budgets]);

  return (
    <Card className="mt-4">
      <CardHeader className="py-1 px-4">
        <CardTitle className="text-base">Budget Overview</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-1 space-y-0.5">
         <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{formatCurrency(totalSpent)}</span>
            <span>{formatCurrency(totalBudget)}</span>
        </div>
        <Progress value={progress} className="h-2"/>
        <div className="text-xs text-center text-muted-foreground pt-0.5">
            {formatCurrency(totalLeft)} remaining
        </div>
      </CardContent>
    </Card>
  );
}
