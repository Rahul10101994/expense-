
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Account } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import AddAccountForm from '@/components/accounts/add-account-form';

export default function AccountsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const accountsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts`);
    }, [firestore, user]);

    const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);
    
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
                    <AddAccountForm />
                </CardHeader>
            </Card>

            {isLoading && (
                 <div className="flex h-full w-full items-center justify-center">
                    <Spinner size="large" />
                </div>
            )}
            
            {!isLoading && accounts && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map(account => (
                         <Card key={account.id}>
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
                    ))}
                </div>
            )}

            {!isLoading && (!accounts || accounts.length === 0) && (
                <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                     <CardTitle className="mb-2">No Accounts Found</CardTitle>
                    <CardDescription className="mb-4">Get started by adding your first financial account.</CardDescription>
                    <AddAccountForm />
                </Card>
            )}
        </div>
    );
}
