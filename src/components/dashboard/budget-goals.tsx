'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import type { Budget } from '@/lib/types';

export default function BudgetGoals({ budgets }: { budgets: Budget[] }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Goals</CardTitle>
        <CardDescription>Your spending progress for this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((budget) => {
            const progress = (budget.spent / budget.limit) * 100;
            return (
                <div key={budget.category}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                           <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                           <span className="text-sm font-medium">{budget.category}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                        </span>
                    </div>
                    <Progress value={progress} />
                </div>
            )
        })}
      </CardContent>
    </Card>
  );
}
