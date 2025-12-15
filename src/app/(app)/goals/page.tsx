import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { goals } from '@/lib/data';
import { Target } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function GoalsPage() {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Financial Goals</CardTitle>
                    <CardDescription>Track your progress towards your long-term financial goals.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.map((goal) => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    return (
                        <Card key={goal.id}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Target className="h-6 w-6 text-primary" />
                                    <CardTitle>{goal.name}</CardTitle>
                                </div>
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
                                    Deadline: {format(new Date(goal.deadline), 'MMMM d, yyyy')} ({formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })})
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
