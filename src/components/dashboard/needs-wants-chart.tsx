
"use client"

import * as React from "react"
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Transaction } from "@/lib/types"

const chartConfig = {
  needs: {
    label: "Needs",
    color: "hsl(var(--chart-1))",
  },
  wants: {
    label: "Wants",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function NeedsWantsChart({ transactions }: { transactions: Transaction[] }) {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const { needsWantsData, totalExpenses } = React.useMemo(() => {
        let needs = 0;
        let wants = 0;
        
        expenses.forEach(t => {
            const amount = t.amount;
            if (t.expenseType === 'need') {
                needs += amount;
            } else if (t.expenseType === 'want') {
                wants += amount;
            }
        });

        const data = [
            { name: 'Needs', value: needs, fill: 'hsl(var(--chart-1))' },
            { name: 'Wants', value: wants, fill: 'hsl(var(--chart-2))' },
        ].filter(item => item.value > 0);
        
        return { needsWantsData: data, totalExpenses: needs + wants };

    }, [expenses]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

  return (
    <>
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Needs vs. Wants</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
          {needsWantsData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value) => formatCurrency(value as number)} />}
                />
                <Pie
                  data={needsWantsData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                    {needsWantsData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : (
             <div className="flex h-[250px] w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No 'Need' or 'Want' data.</p>
            </div>
          )}
      </CardContent>
    </>
  )
}
