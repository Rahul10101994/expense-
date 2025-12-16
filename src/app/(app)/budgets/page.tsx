

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
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets.map((budget) => {
                    const progress = (budget.spent / budget.limit) * 100;
                    const remaining = budget.limit - budget.spent;
                    return (
                        <Card key={budget.category}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                                <CardTitle className="text-xs font-medium flex items-center gap-2">
                                    <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                    {budget.category}
                                </CardTitle>
                                <span className="text-xs text-muted-foreground">
                                    Limit: {formatCurrency(budget.limit)}
                                </span>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-lg font-bold">{formatCurrency(budget.spent)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(remaining)} remaining
                                </p>
                                <Progress value={progress} className="mt-1 h-1" />
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
