
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format, getYear } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  amount: z.coerce.number().positive({
    message: 'Budget amount must be a positive number.',
  }),
  month: z.string().min(1, 'Please select a month'),
});

export default function BudgetPlannerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const budgetsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/budgets`);
  }, [firestore, user]);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      month: currentMonth,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!budgetsCollection || !user) return;
    setIsSubmitting(true);

    const newBudget = {
      userId: user.uid,
      categoryId: 'Total', // Using a special category for the total budget
      amount: values.amount,
      month: values.month + '-01T00:00:00Z', // Format for Firestore timestamp
    };

    try {
      addDocumentNonBlocking(budgetsCollection, newBudget);
      toast({
        title: 'Budget Added',
        description: `Your total budget for the month has been set.`,
      });
      router.push('/budgets');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add budget.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(getYear(new Date()), i, 1);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Link href="/budgets">
              <Button variant="ghost" size="icon">
                <ArrowLeft />
              </Button>
            </Link>
            <div>
                <CardTitle>Budget Planner</CardTitle>
                <CardDescription>
                Set a spending limit for a specific month.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget for the Month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2000.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Next'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
