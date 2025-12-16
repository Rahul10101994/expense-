
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Transaction } from "@/lib/types"

export default function SpendingBreakdownChart({ transactions }: { transactions: Transaction[] }) {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const spendingByCategory = React.useMemo(() => {
        const categoryMap: { [key: string]: number } = {};
        expenses.forEach(t => {
            const categoryKey = t.category || 'Other';
            if (categoryMap[categoryKey]) {
                categoryMap[categoryKey] += Math.abs(t.amount);
            } else {
                categoryMap[categoryKey] = Math.abs(t.amount);
            }
        });

        return Object.entries(categoryMap).map(([category, amount], index) => ({
            category,
            amount,
            fill: `hsl(var(--chart-${index + 1}))`
        })).sort((a,b) => b.amount - a.amount);
    }, [expenses]);
    
    const chartConfig = Object.fromEntries(spendingByCategory.map((item, index) => [
        item.category, {label: item.category, color: `hsl(var(--chart-${index + 1}))`}
    ]));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

  return (
    <>
      <CardHeader>
        <CardTitle>Spending Breakdown</CardTitle>
        <CardDescription>A visual representation of your spending by category.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div className="flex items-center justify-center">
            <ChartContainer
                config={chartConfig}
                className="aspect-square h-[160px]"
                >
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={spendingByCategory}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius="60%"
                        strokeWidth={5}
                        outerRadius={70}
                    >
                    {spendingByCategory.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={entry.fill} />
                    ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
        </div>
        <div className="flex flex-col justify-center gap-2 text-sm">
            {spendingByCategory.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="truncate text-muted-foreground">{item.category}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
            ))}
        </div>
      </CardContent>
    </>
  )
}
