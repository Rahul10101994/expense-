'use client';

import { useState, type ReactNode } from 'react';
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
import { categories } from '@/lib/data';
import { TransactionType, type Transaction, type Account } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  description: z.string().min(2, {
    message: 'Description must be at least 2 characters.',
  }),
  amount: z.coerce.number().positive({
    message: 'Amount must be a positive number.',
  }),
  accountId: z.string({
    required_error: 'Please select an account.',
  }),
  category: z.string({
    required_error: 'Please select a category.',
  }),
  type: z.nativeEnum(TransactionType),
  date: z.date({
    required_error: 'A date is required.',
  }),
});

type AddTransactionFormProps = {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  children?: ReactNode;
};

export default function AddTransactionForm({ onAddTransaction, children }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const accountsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/accounts`);
  }, [firestore, user]);

  const { data: accounts, isLoading: accountsLoading } = useCollection<Account>(accountsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: TransactionType.Expense,
      date: new Date(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user || !accounts) return;

    const { accountId, amount, type } = values;
    const selectedAccount = accounts.find(acc => acc.id === accountId);

    if (!selectedAccount) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Selected account not found.',
        });
        return;
    }

    const transactionAmount = type === 'income' ? amount : -amount;
    const newBalance = selectedAccount.balance + transactionAmount;

    const newTransactionData = {
      ...values,
      amount: transactionAmount,
      date: values.date.toISOString(),
      category: values.category as Transaction['category'],
    };

    const batch = writeBatch(firestore);
    
    // 1. Create new transaction document
    const transactionRef = doc(collection(firestore, `users/${user.uid}/accounts/${accountId}/transactions`));
    batch.set(transactionRef, newTransactionData);

    // 2. Update account balance
    const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountId);
    batch.update(accountRef, { balance: newBalance });

    try {
        await batch.commit();
        onAddTransaction(newTransactionData);
        toast({
            title: 'Transaction Added',
            description: `${values.description} has been successfully recorded.`,
        });
        setOpen(false);
        form.reset();
    } catch (error) {
        console.error('Error adding transaction:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to add transaction. Please try again.',
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your new transaction.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-6">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Type</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    type="button"
                                    variant={field.value === TransactionType.Income ? 'default' : 'outline'}
                                    onClick={() => field.onChange(TransactionType.Income)}
                                >
                                    Income
                                </Button>
                                <Button
                                    type="button"
                                    variant={field.value === TransactionType.Expense ? 'default' : 'outline'}
                                    onClick={() => field.onChange(TransactionType.Expense)}
                                >
                                    Expense
                                </Button>
                                <Button
                                    type="button"
                                    variant={field.value === TransactionType.Investment ? 'default' : 'outline'}
                                    onClick={() => field.onChange(TransactionType.Investment)}
                                >
                                    Investment
                                </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 50.00" {...field} />
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
                            <FormLabel>Transaction Date</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full pl-3 text-left font-normal",
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
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Account</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={accountsLoading}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an account" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                    {account.name}
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
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                {category}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <DialogFooter className="p-6 pt-0">
                        <Button type="submit">Add Transaction</Button>
                    </DialogFooter>
                </form>
                </Form>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
