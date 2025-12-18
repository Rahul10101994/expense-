
'use client';

import { useState } from 'react';
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
import { PlusCircle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, addDoc, writeBatch } from 'firebase/firestore';
import type { Account, Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { TransactionType } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Account name must be at least 2 characters.',
  }),
  type: z.enum(['checking', 'savings', 'investment', 'credit', 'other']),
  balance: z.coerce.number(),
});

type AddAccountFormProps = {
  onAccountAdded?: () => void;
  children?: React.ReactNode;
};

export default function AddAccountForm({ onAccountAdded, children }: AddAccountFormProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      balance: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;
    
    try {
      const batch = writeBatch(firestore);
      
      const newAccountRef = doc(collection(firestore, `users/${user.uid}/accounts`));
      
      const newAccountData: Omit<Account, 'id'> = {
          name: values.name,
          type: values.type,
          balance: values.balance,
          userId: user.uid,
      };
      batch.set(newAccountRef, newAccountData);

      if (values.balance !== 0) {
        const transactionCollectionRef = collection(firestore, `users/${user.uid}/accounts/${newAccountRef.id}/transactions`);
        const newTransactionRef = doc(transactionCollectionRef);
        const initialTransaction: Omit<Transaction, 'id' | 'userId'> = {
          accountId: newAccountRef.id,
          amount: values.balance,
          category: 'Reconciliation',
          date: new Date().toISOString(),
          description: 'Initial Balance',
          type: TransactionType.Reconciliation,
        };
        batch.set(newTransactionRef, initialTransaction);
      }
      
      await batch.commit();
      
      toast({
        title: 'Account Added',
        description: `${values.name} has been added to your accounts.`,
      });
      
      setOpen(false);
      form.reset();
      onAccountAdded?.();

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add account.',
      });
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          {children || (
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Enter the details for your new financial account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Primary Checking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 1250.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Add Account</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
