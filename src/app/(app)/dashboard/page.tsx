import { Card } from '@/components/ui/card';
import OverviewCards from '@/components/dashboard/overview-cards';
import IncomeExpenseChart from '@/components/dashboard/income-expense-chart';
import RecentTransactions from '@/components/dashboard/recent-transactions';
import BudgetGoals from '@/components/dashboard/budget-goals';
import AiInsights from '@/components/dashboard/ai-insights';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';

import { transactions, budgets, goals } from '@/lib/data';

export default async function DashboardPage() {
  // In a real app, this data would be fetched from an API
  const financialData = {
    transactions,
    budgets,
    goals,
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCards transactions={financialData.transactions} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-12 lg:col-span-4">
          <IncomeExpenseChart transactions={financialData.transactions} />
        </Card>
        <Card className="col-span-12 lg:col-span-3">
          <SpendingBreakdownChart transactions={financialData.transactions} />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-12 lg:col-span-4 h-[440px]">
          <RecentTransactions transactions={financialData.transactions} />
        </Card>
        <div className="col-span-12 lg:col-span-3 space-y-4">
            <AiInsights transactions={financialData.transactions} goals={financialData.goals} />
            <BudgetGoals budgets={financialData.budgets} />
        </div>
      </div>
    </div>
  );
}
