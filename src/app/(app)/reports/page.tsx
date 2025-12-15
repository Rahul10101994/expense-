import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { transactions } from '@/lib/data';

export default function ReportsPage() {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>Detailed analysis of your financial activity.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               <Card>
                    <IncomeExpenseChart transactions={transactions} />
                </Card>
                <Card>
                    <SpendingBreakdownChart transactions={transactions} />
                </Card>
            </div>
        </div>
    );
}
