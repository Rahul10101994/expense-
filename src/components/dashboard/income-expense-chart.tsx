
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';
import { TransactionType } from '@/lib/types';

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-2))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
  investments: {
    label: "Investments",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function IncomeExpenseChart({ transactions }: { transactions: Transaction[] }) {
    const chartData = useMemo(() => {
    const dataByDay: { [key: string]: { date: string; income: number; expenses: number; investments: number } } = {};

    transactions.forEach(t => {
      const day = new Date(t.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (!dataByDay[day]) {
        dataByDay[day] = { date: day, income: 0, expenses: 0, investments: 0 };
      }
      if (t.type === TransactionType.Income) {
        dataByDay[day].income += t.amount;
      } else if (t.type === TransactionType.Expense) {
        dataByDay[day].expenses += t.amount;
      } else if (t.type === TransactionType.Investment) {
        dataByDay[day].investments += t.amount;
      }
    });

    return Object.values(dataByDay).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);


  return (
    <>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                    tickFormatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(value as number)}
                />
                 <ChartTooltip content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value as number)} />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                <Bar dataKey="investments" fill="var(--color-investments)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </>
  );
}
