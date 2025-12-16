
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { collection, writeBatch } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format, getYear } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { categories } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';

const stepOneSchema = z.object({
  totalAmount: z.coerce.number().positive({
    message: 'Budget amount must be a positive number.',
  }),
  month: z.string().min(1, 'Please select a month'),
});

const categoryBudgetSchema = z.object({
  category: z.string(),
  amount: z.coerce.number().nonnegative(),
});

const stepTwoSchema = z.object({
  categoryBudgets: z.array(categoryBudgetSchema),
});

const expenseCategories = categories.filter(c => c !== 'Income' && c !== 'Investment');

export default function BudgetPlannerPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalBudget, setTotalBudget] = useState(0);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const budgetsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/budgets`);
  }, [firestore, user]);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const stepOneForm = useForm<z.infer<typeof stepOneSchema>>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      totalAmount: 0,
      month: currentMonth,
    },
  });

  const stepTwoForm = useForm<z.infer<typeof stepTwoSchema>>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      categoryBudgets: expenseCategories.map(cat => ({ category: cat, amount: 0 })),
    },
  });

  const { fields } = useFieldArray({
    control: stepTwoForm.control,
    name: 'categoryBudgets',
  });

  function onStepOneSubmit(values: z.infer<typeof stepOneSchema>) {
    setTotalBudget(values.totalAmount);
    setStep(2);
  }
  
  async function onStepTwoSubmit(values: z.infer<typeof stepTwoSchema>) {
    if (!budgetsCollection || !user) return;
    setIsSubmitting(true);

    const month = stepOneForm.getValues('month');

    try {
        for (const budget of values.categoryBudgets) {
            if (budget.amount > 0) {
                const newBudget = {
                    userId: user.uid,
                    categoryId: budget.category,
                    amount: budget.amount,
                    month: month + '-01T00:00:00Z',
                };
                addDocumentNonBlocking(budgetsCollection, newBudget);
            }
        }
      
        toast({
            title: 'Budgets Saved',
            description: `Your budgets for ${format(new Date(month), 'MMMM yyyy')} have been set.`,
        });
        router.push('/budgets');

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save budgets.',
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

  const remainingBudget = totalBudget - (stepTwoForm.watch('categoryBudgets')?.reduce((acc, b) => acc + (Number(b.amount) || 0), 0) || 0);

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
                  {step === 1 ? 'Set a total spending limit for a specific month.' : 'Allocate your budget across categories.'}
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <Form {...stepOneForm}>
              <form onSubmit={stepOneForm.handleSubmit(onStepOneSubmit)} className="space-y-6">
                <FormField
                  control={stepOneForm.control}
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
                  control={stepOneForm.control}
                  name="totalAmount"
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
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...stepTwoForm}>
              <form onSubmit={stepTwoForm.handleSubmit(onStepTwoSubmit)} className="space-y-4">
                 <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-secondary-foreground">Total Budget for {format(new Date(stepOneForm.getValues('month')), 'MMMM yyyy')}</p>
                    <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBudget)}</p>
                    <p className="text-sm font-medium text-muted-foreground">Remaining: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingBudget)}</p>
                </div>
                 <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={stepTwoForm.control}
                        name={`categoryBudgets.${index}.amount`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>{expenseCategories[index]}</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  className="w-32"
                                  {...formField}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    </div>
                </ScrollArea>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="w-full">Back</Button>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Budget'}
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
