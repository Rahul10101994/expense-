
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Account, Transaction } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import AddAccountForm from '@/components/accounts/add-account-form';
import Link from 'next/link';

export default function AccountsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        // 1. Fetch all account documents
        const accountsQuery = query(collection(firestore, `users/${user.uid}/accounts`));
        const accountsSnapshot = await getDocs(accountsQuery);
        const fetchedAccounts: Account[] = [];
        accountsSnapshot.forEach(doc => {
            fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
        });

        // 2. Fetch all transactions for all accounts
        const allTransactions: Transaction[] = [];
        for (const account of fetchedAccounts) {
            const transactionsQuery = query(collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => {
                allTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
            });
        }
        
        // 3. Calculate current balance for each account
        const accountsWithCalculatedBalances = fetchedAccounts.map(account => {
            const accountTransactions = allTransactions.filter(t => t.accountId === account.id);
            const balance = accountTransactions.reduce((acc, t) => acc + t.amount, account.type === 'credit' ? 0 : 0);
            return { ...account, balance };
        });

        setAccounts(accountsWithCalculatedBalances);
        setIsLoading(false);
    }, [user, firestore]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Accounts</CardTitle>
                        <CardDescription>An overview of all your financial accounts.</CardDescription>
                    </div>
                    <AddAccountForm onAccountAdded={fetchAllData} />
                </CardHeader>
            </Card>

            {isLoading && (
                 <div className="flex h-full w-full items-center justify-center">
                    <Spinner size="large" />
                </div>
            )}
            
            {!isLoading && accounts && accounts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map(account => (
                        <Link href={`/transactions?accountId=${account.id}`} key={account.id}>
                             <Card className="hover:bg-muted/50 transition-colors h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-medium">
                                        {account.name}
                                    </CardTitle>
                                    <span className="text-sm text-muted-foreground capitalize">{account.type}</span>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-primary">{formatCurrency(account.balance)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Current Balance
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {!isLoading && (!accounts || accounts.length === 0) && (
                <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                     <CardTitle className="mb-2">No Accounts Found</CardTitle>
                    <CardDescription className="mb-4">Get started by adding your first financial account.</CardDescription>
                    <AddAccountForm onAccountAdded={fetchAllData} />
                </Card>
            )}
        </div>
    );
}
