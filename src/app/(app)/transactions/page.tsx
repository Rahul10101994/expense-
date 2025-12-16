'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AddTransactionForm from '@/components/transactions/add-transaction-form';
import { CategoryIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Transaction, Account } from '@/lib/types';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';


export default function TransactionsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const isMobile = useIsMobile();

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/accounts/default/transactions`));
    }, [firestore, user]);
    
    const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

    const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
        // The form now handles adding the document.
        // We can use this callback to optimistically update the UI if needed,
        // but for now, we'll let the real-time listener handle it.
    };
    
    const allTransactions = transactions ? [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <Card className={cn(isMobile && "border-0 shadow-none")}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>A complete list of your transactions.</CardDescription>
                </div>
                 {!isMobile && <AddTransactionForm onAddTransaction={handleAddTransaction} />}
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="flex justify-center items-center h-64">
                        <Spinner />
                    </div>
                )}
                {!isLoading && (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                             <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">{transaction.description}</TableCell>
                                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                                 <TableCell>
                                     <div className="flex items-center gap-2">
                                        <CategoryIcon category={transaction.category} className="h-4 w-4 text-muted-foreground"/>
                                        <span>{transaction.category}</span>
                                     </div>
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right font-medium",
                                    transaction.type === 'income' ? 'text-green-500' : 'text-foreground'
                                )}>
                                    {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.type === 'income' ? transaction.amount : transaction.amount)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}
