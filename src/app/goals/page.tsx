
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, PlusCircle, Edit } from 'lucide-react';
import { format, formatDistanceToNow, isSameMonth, isSameYear } from 'date-fns';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Goal, Transaction } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import AddGoalForm from '@/components/goals/add-goal-form';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';

export default function GoalsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const goalsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [firestore, user, refreshKey]);

    const { data: allGoals, isLoading: goalsLoading } = useCollection<Goal>(goalsQuery);
    
    const fetchTransactions = useCallback(async () => {
        if (!user || !firestore) {
            setTransactionsLoading(false);
            return;
        }
        setTransactionsLoading(true);
        const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
        const allTransactions: Transaction[] = [];
        for (const accountDoc of accountsSnapshot.docs) {
            const transactionsSnapshot = await getDocs(collection(accountDoc.ref, 'transactions'));
            transactionsSnapshot.forEach(doc => {
                allTransactions.push(doc.data() as Transaction);
            });
        }
        setTransactions(allTransactions);
        setTransactionsLoading(false);
    }, [user, firestore]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions, refreshKey]);

    const onGoalChange = () => setRefreshKey(k => k + 1);

    const { longTermGoals, recurringGoals } = useMemo(() => {
        if (!allGoals) return { longTermGoals: [], recurringGoals: [] };

        const now = new Date();
        const currentMonthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), now));
        const currentYearTransactions = transactions.filter(t => isSameYear(new Date(t.date), now));

        const calculateCurrentAmount = (goal: Goal) => {
            const relevantTransactions = goal.period === 'monthly' ? currentMonthTransactions : currentYearTransactions;
            let current = 0;
            switch(goal.type) {
                case 'saving': {
                    const income = relevantTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                    const expenses = relevantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                    const investments = relevantTransactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
                    current = income - expenses - investments;
                    break;
                }
                case 'investment':
                    current = relevantTransactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);
                    break;
                case 'need_spending':
                    current = relevantTransactions.filter(t => t.expenseType === 'need').reduce((sum, t) => sum + t.amount, 0);
                    break;
                case 'want_spending':
                    current = relevantTransactions.filter(t => t.expenseType === 'want').reduce((sum, t) => sum + t.amount, 0);
                    break;
            }
            return current;
        };
        
        const recurring = allGoals
            .filter(g => g.period !== 'long_term')
            .map(g => ({...g, currentAmount: calculateCurrentAmount(g)}));
            
        const longTerm = allGoals.filter(g => g.period === 'long_term');
        
        return { longTermGoals: longTerm, recurringGoals: recurring };
    }, [allGoals, transactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const isLoading = goalsLoading || transactionsLoading;

    const renderGoalCard = (goal: Goal) => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        const isLongTerm = goal.period === 'long_term';

        return (
            <Card key={goal.id}>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Target className="h-6 w-6 text-primary" />
                        <CardTitle>{goal.name}</CardTitle>
                    </div>
                    <AddGoalForm goal={goal} onGoalChanged={onGoalChange}>
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </AddGoalForm>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-lg font-bold text-primary">
                                {formatCurrency(goal.currentAmount)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Target: {formatCurrency(goal.targetAmount)}
                            </span>
                        </div>
                        <Progress value={progress} />
                    </div>
                    {isLongTerm && goal.targetDate && (
                        <div className="text-sm text-muted-foreground">
                            Target: {format(new Date(goal.targetDate), 'MMMM d, yyyy')} ({formatDistanceToNow(new Date(goal.targetDate), { addSuffix: true })})
                        </div>
                    )}
                    {!isLongTerm && (
                        <div className="text-sm text-muted-foreground capitalize">
                           {goal.period} Goal
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Financial Goals</CardTitle>
                        <CardDescription>Track your progress towards your financial goals.</CardDescription>
                    </div>
                     <AddGoalForm onGoalChanged={onGoalChange}>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Goal
                        </Button>
                    </AddGoalForm>
                </CardHeader>
            </Card>

            {isLoading && (
                 <div className="flex h-64 w-full items-center justify-center">
                    <Spinner size="large" />
                </div>
            )}
            
            {!isLoading && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Recurring Goals</h2>
                        {recurringGoals.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {recurringGoals.map(renderGoalCard)}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No recurring goals set. Try adding a monthly savings goal!</p>
                        )}
                    </div>
                    
                    <Separator />

                    <div>
                        <h2 className="text-xl font-semibold mb-2">Long-Term Goals</h2>
                        {longTermGoals.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {longTermGoals.map(renderGoalCard)}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No long-term goals set. Saving for a big purchase?</p>
                        )}
                    </div>

                    {allGoals?.length === 0 && (
                        <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                             <CardTitle className="mb-2">No Goals Found</CardTitle>
                            <CardDescription className="mb-4">Get started by adding your first financial goal.</CardDescription>
                             <AddGoalForm onGoalChanged={onGoalChange}>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Goal
                                </Button>
                            </AddGoalForm>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

    