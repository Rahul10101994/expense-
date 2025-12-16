
"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Transaction } from "@/lib/types"

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const outerRadiusWithPadding = outerRadius + 10;
  const x2 = cx + outerRadiusWithPadding * Math.cos(-midAngle * RADIAN);
  const y2 = cy + outerRadiusWithPadding * Math.sin(-midAngle * RADIAN);
  
  const textAnchor = x2 > cx ? 'start' : 'end';


  return (
    <g>
      <path d={`M${x},${y}L${x2},${y2}`} stroke="hsl(var(--foreground))" fill="none" strokeOpacity={0.5}/>
      <text x={x2 + (x2 > cx ? 1 : -1) * 12} y={y2} textAnchor={textAnchor} fill="hsl(var(--foreground))" dominantBaseline="central" className="text-xs">
        {`${payload.category} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};


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

        return Object.entries(categoryMap).map(([category, amount]) => ({
            category,
            amount,
            fill: `hsl(var(--chart-${Object.keys(categoryMap).indexOf(category) + 1}))`
        })).sort((a,b) => b.amount - a.amount);
    }, [expenses]);
    
    const chartConfig = Object.fromEntries(spendingByCategory.map((item, index) => [
        item.category, {label: item.category, color: `hsl(var(--chart-${index + 1}))`}
    ]));
    
    const totalSpent = React.useMemo(() => {
        return spendingByCategory.reduce((acc, curr) => acc + curr.amount, 0)
    }, [spendingByCategory])

  return (
    <>
      <CardHeader className="items-center pb-0">
        <CardTitle>Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
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
              labelLine={false}
              label={renderCustomizedLabel}
            >
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </>
  )
}
