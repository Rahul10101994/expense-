
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
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  if (percent === 0) return null;

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="hsl(var(--foreground))" fill="none" strokeOpacity={0.7} />
      <circle cx={sx} cy={sy} r={2} fill="hsl(var(--foreground))" stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
          {`${payload.category}`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-xs font-semibold">
          {`${(percent * 100).toFixed(0)}%`}
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
