
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { format, getYear, startOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { categories } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type { Budget } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';


const stepOneSchema = z.object({
  totalAmount: z.coerce.number().positive({
    message: 'Budget amount must be a positive number.',
  }),
  month: z.string().min(1, 'Please select a month'),
  carryForward: z.boolean().default(false),
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

  const currentMonth = format(new Date(), 'yyyy-MM');

  const stepOneForm = useForm<z.infer<typeof stepOneSchema>>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      totalAmount: 0,
      month: currentMonth,
      carryForward: false,
    },
  });

  const stepTwoForm = useForm<z.infer<typeof stepTwoSchema>>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      categoryBudgets: expenseCategories.map(cat => ({ category: cat, amount: 0 })),
    },
  });

  const selectedMonth = stepOneForm.watch('month');

  const budgetsQuery = useMemoFirebase(() => {
    if (!user || !selectedMonth) return null;
    const monthStart = startOfMonth(new Date(selectedMonth)).toISOString();
    return query(
      collection(firestore, `users/${user.uid}/budgets`),
      where('month', '==', monthStart),
    );
  }, [firestore, user, selectedMonth]);

  const { data: existingBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  useEffect(() => {
    if (budgetsLoading) return; // Wait until loading is finished

    if (existingBudgets && existingBudgets.length > 0) {
      const total = existingBudgets.reduce((acc, b) => acc + (b.amount || 0), 0);
      setTotalBudget(total);
      stepOneForm.setValue('totalAmount', total);

      const categoryBudgets = expenseCategories.map(cat => {
        const existing = existingBudgets.find(b => b.categoryId === cat);
        return { category: cat, amount: existing?.amount || 0 };
      });
      stepTwoForm.setValue('categoryBudgets', categoryBudgets);
      setStep(2);
    } else {
       // Only reset if we are not loading and there are no budgets for the selected month.
      setStep(1);
      setTotalBudget(0);
      // We keep the selected month in stepOneForm
      stepOneForm.setValue('totalAmount', 0);
      stepOneForm.setValue('carryForward', false);
      stepTwoForm.reset({
        categoryBudgets: expenseCategories.map(cat => ({ category: cat, amount: 0 })),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBudgets, budgetsLoading, selectedMonth]);


  const { fields } = useFieldArray({
    control: stepTwoForm.control,
    name: 'categoryBudgets',
  });

  function onStepOneSubmit(values: z.infer<typeof stepOneSchema>) {
    setTotalBudget(values.totalAmount);
    setStep(2);
  }
  
  async function onStepTwoSubmit(values: z.infer<typeof stepTwoSchema>) {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    const month = stepOneForm.getValues('month');
    const monthStart = startOfMonth(new Date(month)).toISOString();

    try {
      const batch = writeBatch(firestore);
      
      for (const budget of values.categoryBudgets) {
        if (budget.amount >= 0) {
          const existingBudgetDoc = existingBudgets?.find(b => b.categoryId === budget.category);
          
          const budgetData = {
            userId: user.uid,
            categoryId: budget.category,
            amount: budget.amount,
            month: monthStart,
          };
          
          if (existingBudgetDoc) {
            // Update existing document
            const docRef = doc(firestore, `users/${user.uid}/budgets`, existingBudgetDoc.id);
            batch.set(docRef, budgetData, { merge: true });
          } else {
            // Create new document
            const newDocRef = doc(collection(firestore, `users/${user.uid}/budgets`));
            batch.set(newDocRef, budgetData);
          }
        }
      }
      
      await batch.commit();
      
      toast({
          title: 'Budgets Saved',
          description: `Your budgets for ${format(new Date(month), 'MMMM yyyy')} have been set.`,
      });
      router.push('/budgets');

    } catch (error) {
      console.error(error);
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

  if (budgetsLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Spinner size="large" />
          </div>
      )
  }

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
                  name="carryForward"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Carry forward to next month
                        </FormLabel>
                         <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
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
                                  onChange={(e) => {
                                      const value = e.target.value;
                                      formField.onChange(value === '' ? 0 : parseFloat(value));
                                  }}
                                  value={formField.value || 0}
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
