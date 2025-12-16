
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
import { collection, query } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, format } from 'date-fns';

export default function TransactionsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const isMobile = useIsMobile();
    
    const [filterType, setFilterType] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState('all');

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
    
    const filteredTransactions = useMemo(() => {
        let filtered = transactions ? [...transactions] : [];

        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        if (filterMonth !== 'all') {
            filtered = filtered.filter(t => getMonth(new Date(t.date)) === parseInt(filterMonth));
        }

        if (filterYear !== 'all') {
            filtered = filtered.filter(t => getYear(new Date(t.date)) === parseInt(filterYear));
        }

        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, filterType, filterMonth, filterYear]);
    
    const yearOptions = useMemo(() => {
        if (!transactions) return [];
        const years = new Set(transactions.map(t => getYear(new Date(t.date))));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2000, i), 'MMMM')
    }));

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
                <div className="flex flex-wrap gap-2 mb-4">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                            <SelectValue placeholder="Filter by month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {monthOptions.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
                            <SelectValue placeholder="Filter by year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {yearOptions.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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
                        {filteredTransactions.map((transaction) => (
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
                 {!isLoading && filteredTransactions.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No transactions match your filters.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    