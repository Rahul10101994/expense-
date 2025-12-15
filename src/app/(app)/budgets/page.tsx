import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { budgets } from '@/lib/data';

export default function BudgetsPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <BudgetGoals budgets={budgets} />
        </div>
    );
}
