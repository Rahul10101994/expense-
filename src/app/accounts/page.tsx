
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Account, Transaction } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import AddAccountForm from '@/components/accounts/add-account-form';
import Link from 'next/link';
import EditAccountForm from '@/components/accounts/edit-account-form';
import { TransactionType } from '@/lib/types';

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

        const accountsQuery = query(collection(firestore, `users/${user.uid}/accounts`));
        const accountsSnapshot = await getDocs(accountsQuery);
        const fetchedAccounts: Account[] = [];
        accountsSnapshot.forEach(doc => {
            fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
        });

        for (let i = 0; i < fetchedAccounts.length; i++) {
            const account = fetchedAccounts[i];
            const transactionsQuery = query(collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            let balance = 0;
            transactionsSnapshot.forEach(doc => {
                const transaction = doc.data() as Transaction;
                if (transaction.type === TransactionType.Income || transaction.type === TransactionType.Reconciliation) {
                    balance += transaction.amount;
                } else {
                    balance -= transaction.amount;
                }
            });
            fetchedAccounts[i].balance = balance;
        }
        
        setAccounts(fetchedAccounts);
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
                        <Card key={account.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div>
                                    <CardTitle className="text-lg font-medium">
                                        {account.name}
                                    </CardTitle>
                                    <span className="text-sm text-muted-foreground capitalize">{account.type}</span>
                                </div>
                                <EditAccountForm account={account} onAccountChanged={fetchAllData}>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </EditAccountForm>
                            </CardHeader>
                            <Link href={`/transactions?accountId=${account.id}`} className="flex-grow">
                                <CardContent className="hover:bg-muted/50 transition-colors h-full rounded-b-lg">
                                    <div className="text-3xl font-bold text-primary">{formatCurrency(account.balance)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Current Balance
                                    </p>
                                </CardContent>
                            </Link>
                        </Card>
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
