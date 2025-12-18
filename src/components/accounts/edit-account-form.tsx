
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Trash2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Account } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Account name must be at least 2 characters.',
  }),
  type: z.enum(['checking', 'savings', 'investment', 'credit', 'other']),
});

type EditAccountFormProps = {
  account: Account;
  onAccountChanged?: () => void;
  children: React.ReactNode;
};

export default function EditAccountForm({ account, onAccountChanged, children }: EditAccountFormProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account.name,
      type: account.type,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) return;
    
    try {
      const accountDocRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
      
      const updatedAccountData: Partial<Account> = {
          name: values.name,
          type: values.type,
      };

      await setDocumentNonBlocking(accountDocRef, updatedAccountData, { merge: true });
      
      toast({
        title: 'Account Updated',
        description: `${values.name} has been updated.`,
      });
      
      setOpen(false);
      onAccountChanged?.();

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update account.',
      });
      console.error(error);
    }
  }

  async function handleDelete() {
    if (!user || !firestore) return;

    try {
        const batch = writeBatch(firestore);

        // 1. Delete all transactions in the account's subcollection
        const transactionsCollectionRef = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
        const transactionsSnapshot = await getDocs(transactionsCollectionRef);
        transactionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 2. Delete the account document itself
        const accountDocRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
        batch.delete(accountDocRef);

        // 3. Commit the batch
        await batch.commit();
        
        toast({
            title: 'Account Deleted',
            description: `${account.name} and all its transactions have been deleted.`,
        });

        setOpen(false);
        onAccountChanged?.();
        
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete account.',
        });
        console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the details for your account.
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
            <DialogFooter className="flex justify-between w-full !flex-row">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the account '{account.name}' and all of its associated transactions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete Account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
