

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
                    return (
                        <Card key={budget.category}>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{budget.category}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-bold">{formatCurrency(budget.spent)}</span>
                                        <span className="text-muted-foreground"> / {formatCurrency(budget.limit)}</span>
                                    </div>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
