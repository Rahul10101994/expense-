

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { budgets } from '@/lib/data';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';

export default function BudgetsPage() {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };
    return (
        <div className="space-y-4">
            <BudgetGoals budgets={budgets} />
            <Card>
                <CardHeader className="p-2 pt-2">
                    <CardTitle className="text-sm font-medium">Budget by Category</CardTitle>
                    <CardDescription className="text-xs">Your spending progress for each category this month.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget) => {
                    const progress = (budget.spent / budget.limit) * 100;
                    const remaining = budget.limit - budget.spent;
                    return (
                        <Card key={budget.category}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                    {budget.category}
                                </CardTitle>
                                <span className="text-sm text-muted-foreground">
                                    {formatCurrency(budget.limit)}
                                </span>
                            </CardHeader>
                            <CardContent>
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
