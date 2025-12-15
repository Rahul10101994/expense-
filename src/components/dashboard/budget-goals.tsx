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

export default function BudgetGoals({ budgets }: { budgets: Budget[] }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
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
    <Card>
      <CardHeader>
        <CardTitle>Budget Overview</CardTitle>
        <CardDescription>Your spending progress for this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} />
        <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col items-start">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium text-lg">{formatCurrency(totalSpent)}</span>
            </div>
             <div className="flex flex-col items-center">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium text-lg text-primary">{formatCurrency(totalLeft)}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium text-lg">{formatCurrency(totalBudget)}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
