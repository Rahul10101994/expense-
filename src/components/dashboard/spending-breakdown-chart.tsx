
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

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
    
    const totalSpent = React.useMemo(() => {
        return spendingByCategory.reduce((acc, curr) => acc + curr.amount, 0);
    }, [spendingByCategory]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

  return (
    <>
      <CardHeader className="items-center pb-0">
        <CardTitle>Spending Breakdown</CardTitle>
        <CardDescription>Spending by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
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
            >
               {spendingByCategory.map((entry) => (
                <Cell key={`cell-${entry.category}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardContent className="mt-2 text-sm">
        <div className="grid gap-2">
            {spendingByCategory.map((item) => {
                 const percentage = totalSpent > 0 ? ((item.amount / totalSpent) * 100).toFixed(0) : 0;
                 return (
                    <div key={item.category} className="flex items-center">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} />
                        <div className="ml-2 flex-1 truncate">{item.category}</div>
                        <div className="font-medium">{formatCurrency(item.amount)}</div>
                    </div>
                 )
            })}
        </div>
      </CardContent>
    </>
  )
}
