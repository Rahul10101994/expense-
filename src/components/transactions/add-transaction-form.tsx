
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const baseSchema = z.object({
  description: z.string().min(2, {
    message: 'Description must be at least 2 characters.',
  }),
  amount: z.coerce.number().positive({
    message: 'Amount must be a positive number.',
  }),
  date: z.date({
    required_error: 'A date is required.',
  }),
});

const incomeSchema = baseSchema.extend({
  type: z.literal(TransactionType.Income),
  accountId: z.string({ required_error: 'Please select an account.' }),
  category: z.string({ required_error: 'Please select a category.' }),
});

const expenseSchema = baseSchema.extend({
  type: z.literal(TransactionType.Expense),
  accountId: z.string({ required_error: 'Please select an account.' }),
  category: z.string({ required_error: 'Please select a category.' }),
  expenseType: z.enum(['need', 'want']).optional(),
});

const investmentSchema = baseSchema.extend({
    type: z.literal(TransactionType.Investment),
    accountId: z.string({ required_error: 'Please select an account.' }),
    category: z.string({ required_error: 'Please select a category.' }),
});

const transferSchema = baseSchema.extend({
  type: z.literal(TransactionType.Transfer),
  fromAccountId: z.string({
    required_error: 'Please select the source account.',
  }),
  toAccountId: z.string({
    required_error: 'Please select the destination account.',
  }),
});

const formSchema = z.discriminatedUnion("type", [
    incomeSchema,
    expenseSchema,
    investmentSchema,
    transferSchema,
]);

type AddTransactionFormProps = {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  children?: ReactNode;
};

export default function AddTransactionForm({ onAddTransaction, children }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
      type: TransactionType.Expense,
      description: '',
      amount: 0,
      date: new Date(),
    },
  });

  const transactionType = form.watch('type');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user || !accounts) return;
    const batch = writeBatch(firestore);

    if (values.type === TransactionType.Transfer) {
      const { fromAccountId, toAccountId, amount, date, description } = values;
      const fromAccount = accounts.find(acc => acc.id === fromAccountId);
      const toAccount = accounts.find(acc => acc.id === toAccountId);

      if (!fromAccount || !toAccount) {
        toast({ variant: 'destructive', title: 'Error', description: 'One or more accounts not found.' });
        return;
      }
      if (fromAccountId === toAccountId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Source and destination accounts cannot be the same.' });
        return;
      }

      // Create two transactions for the transfer
      const expenseTransactionRef = doc(collection(firestore, `users/${user.uid}/accounts/${fromAccountId}/transactions`));
      batch.set(expenseTransactionRef, {
        description: `Transfer to ${toAccount.name}`,
        amount: -amount,
        date: date.toISOString(),
        type: TransactionType.Expense,
        category: 'Transfer',
        accountId: fromAccountId,
        userId: user.uid,
      });

      const incomeTransactionRef = doc(collection(firestore, `users/${user.uid}/accounts/${toAccountId}/transactions`));
      batch.set(incomeTransactionRef, {
        description: `Transfer from ${fromAccount.name}`,
        amount: amount,
        date: date.toISOString(),
        type: TransactionType.Income,
        category: 'Transfer',
        accountId: toAccountId,
        userId: user.uid,
      });

      // Update balances
      const fromAccountRef = doc(firestore, `users/${user.uid}/accounts`, fromAccountId);
      batch.update(fromAccountRef, { balance: fromAccount.balance - amount });
      const toAccountRef = doc(firestore, `users/${user.uid}/accounts`, toAccountId);
      batch.update(toAccountRef, { balance: toAccount.balance + amount });
      
      try {
        await batch.commit();
        toast({
            title: 'Transfer Successful',
            description: `Transferred ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${fromAccount.name} to ${toAccount.name}.`,
        });
        setOpen(false);
        form.reset();
      } catch(e) {
         console.error('Error completing transfer:', e);
          toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Failed to complete transfer. Please try again.',
          });
      }

    } else { // Income or Expense
      const { accountId, amount, type, ...rest } = values;
      const selectedAccount = accounts.find(acc => acc.id === accountId);

      if (!selectedAccount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected account not found.' });
        return;
      }

      const transactionAmount = type === 'income' ? amount : -amount;
      const newBalance = selectedAccount.balance + transactionAmount;

      const newTransactionData = {
        ...rest,
        type,
        amount: transactionAmount,
        date: values.date.toISOString(),
        category: values.category as Transaction['category'],
        accountId,
        userId: user.uid,
        expenseType: values.type === 'expense' ? values.expenseType : undefined,
      };

      const transactionRef = doc(collection(firestore, `users/${user.uid}/accounts/${accountId}/transactions`));
      batch.set(transactionRef, newTransactionData);

      const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountId);
      batch.update(accountRef, { balance: newBalance });

      try {
        await batch.commit();
        onAddTransaction(newTransactionData as Omit<Transaction, 'id'>);
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
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your new transaction.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[450px] p-4">
              <div className="space-y-4">
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
                            onClick={() => { field.onChange(TransactionType.Income); form.setValue('category', 'Income'); }}
                        >
                            Income
                        </Button>
                        <Button
                            type="button"
                            variant={field.value === TransactionType.Expense ? 'default' : 'outline'}
                            onClick={() => { field.onChange(TransactionType.Expense); form.setValue('category', 'Food'); }}
                        >
                            Expense
                        </Button>
                        <Button
                            type="button"
                            variant={field.value === TransactionType.Transfer ? 'default' : 'outline'}
                            onClick={() => { field.onChange(TransactionType.Transfer); }}
                        >
                            Transfer
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
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                
                {transactionType === TransactionType.Transfer ? (
                <>
                    <FormField
                    control={form.control}
                    name="fromAccountId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>From Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={accountsLoading}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>To Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={accountsLoading}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
                ) : (
                <>
                    <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={accountsLoading}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {accounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {categories
                                .filter(c => transactionType === TransactionType.Income ? c === 'Income' : c !== 'Income')
                                .map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {transactionType === 'expense' && (
                        <FormField
                            control={form.control}
                            name="expenseType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Is this a need or a want?</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex space-x-4"
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
                </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t">
              <Button type="submit">Add Transaction</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
