
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
            <div className="grid grid-cols-2 gap-4">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[150px]"
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
                            innerRadius={40}
                            strokeWidth={5}
                            outerRadius={60}
                        >
                            {spendingByCategory.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="flex flex-col justify-center">
                     <ul className="grid gap-1 text-xs">
                        {spendingByCategory.map((entry, index) => {
                            const percentage = totalExpenses > 0 ? (entry.value / totalExpenses * 100).toFixed(0) : 0;
                            return (
                                <li key={entry.name} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                        <span className="text-muted-foreground truncate">{entry.name}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="font-medium w-8 text-right">{percentage}%</span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
          ) : (
             <div className="flex h-[150px] w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No spending data available.</p>
            </div>
          )}
      </CardContent>
    </>
  )
}
