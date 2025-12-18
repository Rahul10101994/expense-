
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { collection, query, getDocs } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TransactionsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const isMobile = useIsMobile();
    
    const [filterType, setFilterType] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState('all');

     const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);
    const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);

    const fetchTransactions = async () => {
        if (!user || !firestore || !accounts) return;
        setTransactionsLoading(true);
        const allTransactions: Transaction[] = [];
        for (const account of accounts) {
            const transactionsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`));
            transactionsSnapshot.forEach(doc => {
                allTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
            });
        }
        setTransactions(allTransactions);
        setTransactionsLoading(false);
    };

    useEffect(() => {
        if (accounts) {
            fetchTransactions();
        }
    }, [accounts]);

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
        if (!transactions || transactions.length === 0) return [];
        const years = new Set(transactions.map(t => getYear(new Date(t.date))));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2000, i), 'MMMM')
    }));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const getAccountName = (accountId: string) => {
        return accounts?.find(acc => acc.id === accountId)?.name || 'Unknown';
    }

    const isLoading = accountsLoading || transactionsLoading;

    return (
        <Card className={cn(isMobile && "border-0 shadow-none")}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>A complete list of your transactions.</CardDescription>
                </div>
                 <AddTransactionForm onTransactionAdded={fetchTransactions}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddTransactionForm>
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
                    <Select value={filterYear} onValueChange={setFilterYear} disabled={yearOptions.length === 0}>
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
                            <TableHead>Account</TableHead>
                            <TableHead>Date</TableHead>
                             <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">{transaction.description}</TableCell>
                                <TableCell className="text-muted-foreground">{getAccountName(transaction.accountId)}</TableCell>
                                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                                 <TableCell>
                                     <div className="flex items-center gap-2">
                                        <CategoryIcon category={transaction.category} className="h-4 w-4 text-muted-foreground"/>
                                        <div className="flex flex-col">
                                            <span>{transaction.category}</span>
                                            {transaction.type === 'expense' && transaction.expenseType && (
                                                <Badge variant={transaction.expenseType === 'need' ? 'default' : 'secondary'} className="capitalize w-fit text-xs px-1 h-4">{transaction.expenseType}</Badge>
                                            )}
                                        </div>
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
