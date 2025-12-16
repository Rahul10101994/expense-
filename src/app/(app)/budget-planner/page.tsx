
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
import { format, getYear, startOfMonth, addMonths, isSameMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { categories } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type { Budget } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';


const categoryBudgetSchema = z.object({
  category: z.string(),
  amount: z.coerce.number().nonnegative(),
});

const budgetFormSchema = z.object({
  totalAmount: z.coerce.number().positive({
    message: 'Budget amount must be a positive number.',
  }),
  month: z.string().min(1, 'Please select a month'),
  carryForward: z.boolean().default(false),
  categoryBudgets: z.array(categoryBudgetSchema),
});


const expenseCategories = categories.filter(c => c !== 'Income' && c !== 'Investment');

export default function BudgetPlannerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const currentMonth = format(new Date(), 'yyyy-MM');

  const form = useForm<z.infer<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      totalAmount: 0,
      month: currentMonth,
      carryForward: false,
      categoryBudgets: expenseCategories.map(cat => ({ category: cat, amount: 0 })),
    },
  });

  const selectedMonth = form.watch('month');
  const totalBudget = form.watch('totalAmount');

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
    if (budgetsLoading) {
      return;
    }
  
    if (existingBudgets) {
      if (existingBudgets.length > 0) {
        const total = existingBudgets.reduce((acc, b) => acc + (b.amount || 0), 0);
        const categoryBudgets = expenseCategories.map(cat => {
          const existing = existingBudgets.find(b => b.categoryId === cat);
          return { category: cat, amount: existing?.amount || 0 };
        });
  
        form.reset({
          totalAmount: total,
          month: selectedMonth,
          carryForward: false, // Default carryForward to false, user can re-enable if needed
          categoryBudgets: categoryBudgets,
        });
      } else {
        // Only reset amounts, keep month and total amount if user was editing
        form.setValue('categoryBudgets', expenseCategories.map(cat => ({ category: cat, amount: 0 })));
      }
    }
  }, [existingBudgets, budgetsLoading, selectedMonth, form]);


  async function onSubmit(values: z.infer<typeof budgetFormSchema>) {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    const month = values.month;
    const monthStart = startOfMonth(new Date(month)).toISOString();

    try {
      const batch = writeBatch(firestore);
      
      for (const budget of values.categoryBudgets) {
        if (budget.amount >= 0) {
          const existingBudgetDoc = existingBudgets?.find(b => b.categoryId === budget.category && isSameMonth(new Date(b.month), new Date(monthStart)));
          
          const budgetData = {
            userId: user.uid,
            categoryId: budget.category,
            amount: budget.amount,
            month: monthStart,
          };
          
          if (existingBudgetDoc && existingBudgetDoc.id) {
            const docRef = doc(firestore, `users/${user.uid}/budgets`, existingBudgetDoc.id);
            batch.set(docRef, budgetData, { merge: true });
          } else {
            const newDocRef = doc(collection(firestore, `users/${user.uid}/budgets`));
            batch.set(newDocRef, budgetData);
          }
        }
      }
      
      await batch.commit();
      
      if (values.carryForward) {
        const nextMonthDate = addMonths(new Date(month), 1);
        const nextMonthStart = startOfMonth(nextMonthDate).toISOString();
        const nextMonthBatch = writeBatch(firestore);

        for (const budget of values.categoryBudgets) {
           if (budget.amount >= 0) {
             const nextMonthBudgetData = {
                userId: user.uid,
                categoryId: budget.category,
                amount: budget.amount,
                month: nextMonthStart,
              };
             const newDocRef = doc(collection(firestore, `users/${user.uid}/budgets`));
             nextMonthBatch.set(newDocRef, nextMonthBudgetData);
           }
        }
        await nextMonthBatch.commit();
        toast({
          title: 'Budgets Saved and Copied',
          description: `Your budgets for ${format(new Date(month), 'MMMM yyyy')} have been set and also copied to ${format(nextMonthDate, 'MMMM yyyy')}.`,
        });
      } else {
        toast({
            title: 'Budgets Saved',
            description: `Your budgets for ${format(new Date(month), 'MMMM yyyy')} have been set.`,
        });
      }
      
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

  const remainingBudget = totalBudget - (form.watch('categoryBudgets')?.reduce((acc, b) => acc + (Number(b.amount) || 0), 0) || 0);

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
        <CardHeader className="p-4">
          <div className="flex items-center gap-4">
             <Link href="/budgets">
              <Button variant="ghost" size="icon">
                <ArrowLeft />
              </Button>
            </Link>
            <div>
                <CardTitle className="text-lg">Budget Planner</CardTitle>
                <CardDescription className="text-xs">
                  Allocate your budget across different categories for the month.
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger className="h-9">
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
                    name="totalAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Total Budget for the Month</FormLabel>
                        <FormControl>
                            <Input
                            type="number"
                            placeholder="e.g., 2000.00"
                            className="h-9"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="carryForward"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2 md:col-span-2">
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
                </div>
                
                 <div className="p-2 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-secondary-foreground">Total Budget for {format(new Date(form.getValues('month')), 'MMMM yyyy')}</p>
                    <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalBudget)}</p>
                    <p className="text-sm font-medium text-muted-foreground">Remaining: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(remainingBudget)}</p>
                </div>
                
                 <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                    {expenseCategories.map((category, index) => (
                      <FormField
                        key={category}
                        control={form.control}
                        name={`categoryBudgets.${index}.amount`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>{category}</FormLabel>
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
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Budget'}
                </Button>
              </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
