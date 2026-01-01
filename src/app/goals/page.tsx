
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, PlusCircle, Edit } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Goal } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import AddGoalForm from '@/components/goals/add-goal-form';
import { Button } from '@/components/ui/button';

export default function GoalsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const goalsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [firestore, user]);

    const { data: goals, isLoading } = useCollection<Goal>(goalsQuery);

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
                        <CardTitle>Financial Goals</CardTitle>
                        <CardDescription>Track your progress towards your long-term financial goals.</CardDescription>
                    </div>
                     <AddGoalForm>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Goal
                        </Button>
                    </AddGoalForm>
                </CardHeader>
            </Card>

            {isLoading && (
                 <div className="flex h-full w-full items-center justify-center">
                    <Spinner size="large" />
                </div>
            )}
            
            {!isLoading && goals && (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal) => {
                        const progress = (goal.currentAmount / goal.targetAmount) * 100;
                        return (
                            <Card key={goal.id}>
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Target className="h-6 w-6 text-primary" />
                                        <CardTitle>{goal.name}</CardTitle>
                                    </div>
                                    <AddGoalForm goal={goal}>
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
                                    <div className="text-sm text-muted-foreground">
                                        Target: {format(new Date(goal.targetDate), 'MMMM d, yyyy')} ({formatDistanceToNow(new Date(goal.targetDate), { addSuffix: true })})
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

             {!isLoading && (!goals || goals.length === 0) && (
                <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                     <CardTitle className="mb-2">No Goals Found</CardTitle>
                    <CardDescription className="mb-4">Get started by adding your first financial goal.</CardDescription>
                     <AddGoalForm>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Goal
                        </Button>
                    </AddGoalForm>
                </Card>
            )}
        </div>
    );
}
