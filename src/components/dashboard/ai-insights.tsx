'use client';

import { useEffect, useState, useMemo } from 'react';
import { getPersonalizedInsights, PersonalizedInsightsInput } from '@/ai/flows/personalized-financial-insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction, Goal } from '@/lib/types';

export default function AiInsights({ transactions, goals }: { transactions: Transaction[]; goals: Goal[] }) {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const inputData = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const spendingByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryKey = t.category || 'Other';
        acc[categoryKey] = (acc[categoryKey] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);
      
    const topCategory = Object.entries(spendingByCategory).sort(([, a], [, b]) => b - a)[0]?.[0];

    const spendingPatterns = `User's top spending category is ${topCategory || 'not yet available'}. Total monthly spending is significant.`;
    
    let financialGoals = "No specific financial goals have been set yet.";
    if (goals && goals.length > 0) {
      financialGoals = goals.map(g => g.name).join(', ');
    }


    return {
      income: totalIncome,
      spendingPatterns,
      financialGoals,
    };
  }, [transactions, goals]);

  useEffect(() => {
    async function fetchInsights() {
      if (!inputData.income && transactions.length === 0) {
        setInsights("Add some transactions to get started with personalized financial insights.");
        setLoading(false);
        return;
      }
      
      const input: PersonalizedInsightsInput = inputData;

      try {
        setLoading(true);
        const result = await getPersonalizedInsights(input);
        setInsights(result.insights);
      } catch (error) {
        console.error("Error fetching AI insights:", error);
        setInsights("Could not load financial insights at this time.");
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [inputData, transactions.length]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Intelligent Insights
        </CardTitle>
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {insights}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
