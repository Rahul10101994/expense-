
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isSameMonth } from 'date-fns';

export default function NeedsWantsSummary({ transactions }: { transactions: Transaction[] }) {
    const { needs, wants, totalExpenses } = React.useMemo(() => {
        let needs = 0;
        let wants = 0;

        if (transactions) {
            const expenses = transactions.filter(t => t.type === 'expense' && isSameMonth(new Date(t.date), new Date()));
            expenses.forEach(t => {
                if (t.expenseType === 'need') {
                    needs += t.amount;
                } else if (t.expenseType === 'want') {
                    wants += t.amount;
                }
            });
        }
        
        return { needs, wants, totalExpenses: needs + wants };
    }, [transactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const getPercentage = (amount: number) => {
        if (totalExpenses === 0) return '0%';
        return `${((amount / totalExpenses) * 100).toFixed(0)}%`;
    }

    return (
        <Card>
            <CardHeader className="items-center py-2">
                <CardTitle className="text-sm font-medium">Needs vs. Wants</CardTitle>
            </CardHeader>
            <CardContent>
                {totalExpenses > 0 ? (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">Needs</span>
                            <div className="text-right">
                                <div className="font-semibold">{formatCurrency(needs)}</div>
                                <div className="text-xs text-muted-foreground">{getPercentage(needs)}</div>
                            </div>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">Wants</span>
                            <div className="text-right">
                                <div className="font-semibold">{formatCurrency(wants)}</div>
                                <div className="text-xs text-muted-foreground">{getPercentage(wants)}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-[80px] w-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">No data for this month.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
