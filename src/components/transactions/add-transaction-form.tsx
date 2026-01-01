
'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { collection, addDoc, doc, writeBatch } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Transaction, Category, Account } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { TransactionType } from '@/lib/types';

const formSchema = z.object({
  description: z.string().min(1, 'Required'),
  amount: z.coerce.number().refine(val => val !== 0, 'Required'),
  accountId: z.string().min(1, 'Required'),
  type: z.enum(['income', 'expense', 'investment', 'transfer', 'reconciliation']),
  category: z.string(),
  date: z.date({ required_error: "Required" }),
  expenseType: z.enum(['need', 'want']).optional(),
}).refine(data => data.type !== 'expense' || !!data.expenseType, {
  message: 'Classify expense',
  path: ['expenseType'],
}).refine(data => ['income', 'transfer', 'reconciliation'].includes(data.type) || (data.category && data.category.length > 0), {
    message: 'Required',
    path: ['category'],
});

export default function AddTransactionForm({ children, onTransactionAdded, transactionToEdit }: { children?: ReactNode, onTransactionAdded?: () => void, transactionToEdit?: Transaction }) {
  const [open, setOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const accountsQuery = useMemoFirebase(() => user && firestore ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
  const { data: accounts } = useCollection<Account>(accountsQuery);

  const categoriesQuery = useMemoFirebase(() => user && firestore ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
        ...transactionToEdit,
        amount: Math.abs(transactionToEdit.amount),
        date: new Date(transactionToEdit.date),
        type: transactionToEdit.type as 'income' | 'expense' | 'investment' | 'transfer' | 'reconciliation',
        category: transactionToEdit.category || '',
    } : { description: '', amount: 0, accountId: '', type: 'expense', category: '' },
  });

  const transactionType = form.watch('type');
  const isEditMode = !!transactionToEdit;

  const filteredCategories = useMemo(() => 
    categories?.filter(c => c.type === transactionType) || [], 
  [categories, transactionType]);

  const transferAccounts = useMemo(() => 
    accounts?.filter(acc => acc.id !== form.getValues('accountId')) || [], 
  [accounts, form.watch('accountId')]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !accounts || !firestore) return;

    const selectedAccount = accounts.find(acc => acc.id === values.accountId);
    if (!selectedAccount) return;

    let category = values.category;
    if (values.type === TransactionType.Income) {
        category = 'Income';
    } else if (values.type === TransactionType.Transfer) {
        category = 'Transfer';
    } else if (values.type === TransactionType.Reconciliation) {
        category = 'Reconciliation';
    }
    
    const amount = [TransactionType.Income, TransactionType.Reconciliation].includes(values.type) ? Math.abs(values.amount) : -Math.abs(values.amount);

    const transactionData: Omit<Transaction, 'id' | 'userId'> = {
      description: values.description,
      amount: amount,
      accountId: values.accountId,
      type: values.type,
      category: category as Transaction['category'],
      date: values.date.toISOString(),
    };

    if (values.type === TransactionType.Expense && values.expenseType) {
        transactionData.expenseType = values.expenseType;
    }

    try {
        const batch = writeBatch(firestore);

        if (isEditMode && transactionToEdit) {
            const docRef = doc(firestore, `users/${user.uid}/accounts/${values.accountId}/transactions`, transactionToEdit.id);
            setDocumentNonBlocking(docRef, transactionData, { merge: true });
        } else {
            const transactionCollectionRef = collection(firestore, `users/${user.uid}/accounts/${selectedAccount.id}/transactions`);
            addDocumentNonBlocking(transactionCollectionRef, transactionData);
        }

        if (values.type === TransactionType.Transfer) {
            const toAccount = accounts.find(acc => acc.name === values.category);
            if(toAccount) {
                const transferTransactionData: Omit<Transaction, 'id' | 'userId'> = {
                  accountId: toAccount.id,
                  category: 'Transfer',
                  amount: Math.abs(values.amount),
                  type: TransactionType.Income,
                  description: `Transfer from ${selectedAccount.name}`,
                  date: values.date.toISOString()
                };
                const toTransactionCollectionRef = collection(firestore, `users/${user.uid}/accounts/${toAccount.id}/transactions`);
                addDocumentNonBlocking(toTransactionCollectionRef, transferTransactionData);
            }
        }
        
        toast({ title: 'Success', description: `Transaction ${isEditMode ? 'updated' : 'added'}` });
        setOpen(false);
        form.reset({ description: '', amount: 0, accountId: '', type: 'expense', category: '' });
        onTransactionAdded?.();
    } catch(error) {
        console.error("Error saving transaction: ", error)
        toast({ title: 'Error', description: 'Could not save transaction' });
    }
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        form.reset({ description: '', amount: 0, accountId: '', type: 'expense', category: '' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{isEditMode ? 'Edit Transaction' : 'New Transaction'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            {/* Main scrollable area */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="space-y-4 pb-4">
                {/* Type Switcher */}
                <div className="flex p-1 bg-muted rounded-md w-full">
                    {['expense', 'income', 'investment', 'transfer'].map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => {
                        form.setValue('type', t as any);
                        form.setValue('category', '');
                        }}
                        className={cn(
                        "flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all capitalize",
                        transactionType === t ? "bg-background shadow-sm" : "text-muted-foreground"
                        )}
                        disabled={isEditMode}
                    >
                        {t}
                    </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl><Input placeholder="e.g. Coffee" className="h-10" {...field} /></FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Amount</FormLabel>
                        <FormControl><Input type="number" step="0.01" className="h-10" {...field} /></FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

<FormField
  control={form.control}
  name="date"
  render={({ field }) => (
    <FormItem className="flex flex-col">
      <FormLabel className="text-xs">Date</FormLabel>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={true}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              type="button"
              className={cn(
                "h-10 px-3 text-left font-normal text-sm w-full",
                !field.value && "text-muted-foreground"
              )}
            >
              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start" 
          onCloseAutoFocus={(e) => e.preventDefault()} 
        >
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={(date) => {
              if (date) {
                field.onChange(date);
                setIsCalendarOpen(false);
              }
            }}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormMessage className="text-[10px]" />
    </FormItem>
  )}
/>

                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-xs">{transactionType === 'transfer' ? 'From' : 'Account'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                          <SelectContent>{accounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {transactionType === 'transfer' && (
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-xs">To Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Target Account" /></SelectTrigger></FormControl>
                            <SelectContent>{transferAccounts.map(acc => <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {(transactionType === 'expense' || transactionType === 'investment') && (
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-xs">Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                            <SelectContent>{filteredCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  )}

                  {transactionType === 'expense' && (
                    <FormField
                      control={form.control}
                      name="expenseType"
                      render={({ field }) => (
                        <FormItem className="space-y-3 md:col-span-2">
                          <FormLabel className="text-xs">Classification</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                              <div className="flex items-center space-x-2"><RadioGroupItem value="need" id="need" /><label htmlFor="need" className="text-sm">Need</label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="want" id="want" /><label htmlFor="want" className="text-sm">Want</label></div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 pt-4 border-t bg-background">
                <Button type="submit" className="w-full h-11">{isEditMode ? 'Save Changes' : 'Save Transaction'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    