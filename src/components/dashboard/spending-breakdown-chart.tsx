
"use client"

import * as React from "react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils";

export default function SpendingBreakdownChart({ transactions }: { transactions: Transaction[] }) {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const { spendingByCategory, totalExpenses } = React.useMemo(() => {
        const categoryMap: { [key: string]: number } = {};
        let total = 0;
        expenses.forEach(t => {
            const amount = Math.abs(t.amount);
            const categoryKey = t.category || 'Other';
            if (categoryMap[categoryKey]) {
                categoryMap[categoryKey] += amount;
            } else {
                categoryMap[categoryKey] = amount;
            }
            total += amount;
        });

        const spendingData = Object.entries(categoryMap).map(([category, amount], index) => ({
            name: category,
            value: amount,
            fill: `hsl(var(--chart-${index + 1}))`
        })).sort((a,b) => b.value - a.value);
        
        return { spendingByCategory: spendingData, totalExpenses: total };

    }, [expenses]);
    
    const chartConfig = Object.fromEntries(spendingByCategory.map((item, index) => [
        item.name, {label: item.name, color: `hsl(var(--chart-${index + 1}))`}
    ])) satisfies ChartConfig;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

  return (
    <>
      <CardHeader className="items-center py-2">
        <CardTitle className="text-sm font-medium">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
          {spendingByCategory.length > 0 ? (
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[250px]"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value) => formatCurrency(value as number)} />}
                    />
                    <Pie
                        data={spendingByCategory}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        strokeWidth={5}
                        outerRadius={80}
                    >
                        {spendingByCategory.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Legend
                        content={({ payload }) => {
                            return (
                            <ul className="grid gap-1 text-xs mt-4">
                                {payload?.map((entry: any, index: number) => {
                                    const { name, value } = spendingByCategory[index];
                                    const percentage = totalExpenses > 0 ? (value / totalExpenses * 100).toFixed(0) : 0;
                                    return (
                                        <li key={entry.value} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                <span className="text-muted-foreground">{entry.value}</span>
                                            </div>
                                            <span className="font-medium">{percentage}%</span>
                                        </li>
                                    )
                                })}
                            </ul>
                            )
                        }}
                        verticalAlign="bottom"
                        align="center"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex h-[250px] w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No spending data available.</p>
            </div>
          )}
      </CardContent>
    </>
  )
}
