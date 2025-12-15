'use client';

import { useState } from 'react';
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
import { transactions as initialTransactions } from '@/lib/data';
import { CategoryIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

    const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
        const transactionWithId = {
            ...newTransaction,
            id: (transactions.length + 1).toString(),
        };
        setTransactions(prevTransactions => [transactionWithId, ...prevTransactions]);
    };
    
    const allTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>A complete list of your transactions.</CardDescription>
                </div>
                <AddTransactionForm onAddTransaction={handleAddTransaction} />
            </CardHeader>
            <CardContent>
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
                                    {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.type === 'income' ? transaction.amount : -transaction.amount)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
