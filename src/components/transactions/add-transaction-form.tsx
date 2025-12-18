
'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Transaction, Category, Account } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  amount: z.coerce.number().refine(val => val !== 0, 'Amount cannot be zero.'),
  accountId: z.string().min(1, 'Please select an account.'),
  type: z.enum(['income', 'expense', 'investment', 'transfer']),
  category: z.string().min(1, 'Please select a category.'),
  date: z.date({
    required_error: "A date is required.",
  }),
  expenseType: z.enum(['need', 'want']).optional(),
}).refine(data => {
    if (data.type === 'expense') {
        return !!data.expenseType;
    }
    return true;
}, {
    message: 'Please classify the expense as a need or a want.',
    path: ['expenseType'],
});

type AddTransactionFormProps = {
  transaction?: Transaction;
  children?: ReactNode;
  onTransactionAdded?: () => void;
};

export default function AddTransactionForm({ transaction, children, onTransactionAdded }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);


  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/accounts`);
  }, [firestore, user]);
  const { data: accounts } = useCollection<Account>(accountsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/categories`);
  }, [firestore, user]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      accountId: '',
      type: 'expense',
      category: '',
      date: undefined,
    },
  });

  const transactionType = form.watch('type');

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;

    const transactionData = {
      ...values,
      amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
      date: values.date.toISOString(),
      userId: user.uid,
    };
    
    const transactionsCol = collection(firestore, `users/${user.uid}/accounts/${values.accountId}/transactions`);
    addDocumentNonBlocking(transactionsCol, transactionData);

    toast({
        title: 'Transaction Added',
        description: `${values.description} has been successfully added.`,
    });
    
    setOpen(false);
    onTransactionAdded?.();
  }

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (transactionType === 'transfer') return [];
    return categories.filter(c => c.type === transactionType);
  }, [categories, transactionType]);
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      form.reset({
        description: '',
        amount: 0,
        accountId: accounts?.[0]?.id || '',
        type: 'expense',
        category: '',
        date: undefined,
      });
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your transaction below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              type="button"
                              className={cn(
                                "w-full pl-3 text-left font-normal h-10",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-0" 
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                          onPointerDownOutside={(e) => e.preventDefault()}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsCalendarOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map(account => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); form.setValue('category', ''); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {transactionType && transactionType !== 'transfer' && (
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger disabled={!transactionType || filteredCategories.length === 0}>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {filteredCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            </div>
             {transactionType === 'expense' && (
              <FormField
                control={form.control}
                name="expenseType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Is this a need or a want?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="need" />
                          </FormControl>
                          <FormLabel className="font-normal">Need</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="want" />
                          </FormControl>
                          <FormLabel className="font-normal">Want</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <Button type="submit">Add Transaction</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
