
'use client';

import {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';
import { CategoryIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RecentTransactions({ transactions, onTransactionAdded }: { transactions: Transaction[], onTransactionAdded?: () => void }) {
    const recentTransactions = useMemo(() => {
        return [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    }, [transactions]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    return (
        <>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>A list of your most recent transactions.</CardDescription>
                </div>
                <Link href="/transactions" passHref>
                    <Button variant="ghost" size="sm">
                        See All
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                               <CategoryIcon category={transaction.category} className="h-4 w-4 text-muted-foreground"/>
                                            </div>
                                            <div>
                                                <div className="font-medium">{transaction.description}</div>
                                                <div className="text-sm text-muted-foreground">{transaction.category}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-medium",
                                        transaction.type === 'income' ? 'text-green-500' : 'text-foreground'
                                    )}>
                                        {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </>
    );
}
