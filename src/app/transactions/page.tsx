
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import ManageTransactionDialog from '@/components/transactions/manage-transaction-dialog';

export default function TransactionsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const isMobile = useIsMobile();
    const searchParams = useSearchParams();
    const router = useRouter();

    const accountIdFilter = searchParams.get('accountId');
    
    const [filterType, setFilterType] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState('all');

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleTransactionChange = useCallback(() => {
        setRefreshKey(oldKey => oldKey + 1);
    }, []);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user || !firestore) {
                setIsLoading(false);
                return;
            };
            setIsLoading(true);

            // 1. Fetch accounts
            const fetchedAccounts: Account[] = [];
            const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
            accountsSnapshot.forEach(doc => {
                fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
            });
            setAccounts(fetchedAccounts);
            
            // 2. Fetch transactions for all accounts
            const fetchedTransactions: Transaction[] = [];
            for (const account of fetchedAccounts) {
                const transactionsColRef = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
                const transactionsQuery = query(transactionsColRef, orderBy('date', 'desc'));
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.forEach(doc => {
                    fetchedTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
                });
            }
            
            // Sort all transactions by date after fetching
            fetchedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setTransactions(fetchedTransactions);
            setIsLoading(false);
        };
        
        fetchAllData();
    }, [user, firestore, refreshKey]);

    const filteredTransactions = useMemo(() => {
        let filtered = transactions ? [...transactions] : [];

        if (accountIdFilter) {
            filtered = filtered.filter(t => t.accountId === accountIdFilter);
        }

        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        if (filterMonth !== 'all') {
            filtered = filtered.filter(t => getMonth(new Date(t.date)) === parseInt(filterMonth));
        }

        if (filterYear !== 'all') {
            filtered = filtered.filter(t => getYear(new Date(t.date)) === parseInt(filterYear));
        }

        return filtered;
    }, [transactions, accountIdFilter, filterType, filterMonth, filterYear]);
    
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

    const clearAccountFilter = () => {
        router.push('/transactions');
    }

    return (
        <Card className={cn(isMobile && "border-0 shadow-none")}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Transactions</CardTitle>
                    <CardDescription>A complete list of your transactions.</CardDescription>
                </div>
                 <AddTransactionForm onTransactionAdded={handleTransactionChange}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </AddTransactionForm>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                    {accountIdFilter && (
                        <Badge variant="secondary" className="flex items-center gap-2 text-sm">
                            <span>Account: {getAccountName(accountIdFilter)}</span>
                             <Button variant="ghost" size="icon" className="h-4 w-4" onClick={clearAccountFilter}>
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    )}
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
                            {!isMobile && !accountIdFilter && <TableHead>Account</TableHead>}
                            {!isMobile && <TableHead>Date</TableHead>}
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">
                                    {transaction.description}
                                    {isMobile && <div className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</div>}
                                </TableCell>
                                {!isMobile && !accountIdFilter && <TableCell className="text-muted-foreground">{getAccountName(transaction.accountId)}</TableCell>}
                                {!isMobile && <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>}
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
                                    {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <ManageTransactionDialog 
                                        transaction={transaction}
                                        onTransactionUpdate={handleTransactionChange}
                                        onTransactionDelete={handleTransactionChange}
                                    />
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
