
"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts"

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

export default function SpendingBreakdownChart({ transactions }: { transactions: Transaction[] }) {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const spendingByCategory = React.useMemo(() => {
        const categoryMap: { [key: string]: number } = {};
        expenses.forEach(t => {
            if (categoryMap[t.category]) {
                categoryMap[t.category] += Math.abs(t.amount);
            } else {
                categoryMap[t.category] = Math.abs(t.amount);
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


  return (
    <>
      <CardHeader className="items-center py-2">
        <CardTitle className="text-sm font-medium">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={spendingByCategory}
              dataKey="amount"
              nameKey="category"
              innerRadius="60%"
              strokeWidth={2}
            >
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </>
  )
}
