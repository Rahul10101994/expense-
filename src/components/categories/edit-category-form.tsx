
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
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Category name must be at least 2 characters.',
  }),
});

type EditCategoryFormProps = {
  category: Category;
  onCategoryChanged: () => void;
  children: React.ReactNode;
};

export default function EditCategoryForm({ category, onCategoryChanged, children }: EditCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category.name,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore || values.name === category.name) {
        setOpen(false);
        return;
    };

    try {
      const batch = writeBatch(firestore);

      // 1. Update the category document
      const categoryRef = doc(firestore, `users/${user.uid}/categories`, category.id);
      batch.update(categoryRef, { name: values.name });

      // 2. Update budgets
      const budgetsQuery = query(collection(firestore, `users/${user.uid}/budgets`), where('categoryId', '==', category.name));
      const budgetsSnapshot = await getDocs(budgetsQuery);
      budgetsSnapshot.forEach(budgetDoc => {
        batch.update(budgetDoc.ref, { categoryId: values.name });
      });

      // 3. Update transactions in all accounts
      const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
      for (const accountDoc of accountsSnapshot.docs) {
          const transactionsQuery = query(
              collection(firestore, `users/${user.uid}/accounts/${accountDoc.id}/transactions`),
              where('category', '==', category.name)
          );
          const transactionsSnapshot = await getDocs(transactionsQuery);
          transactionsSnapshot.forEach(transactionDoc => {
              batch.update(transactionDoc.ref, { category: values.name });
          });
      }
      
      await batch.commit();
      
      toast({
        title: 'Category Updated',
        description: `"${category.name}" was renamed to "${values.name}".`,
      });

      setOpen(false);
      onCategoryChanged();

    } catch (error) {
      console.error("Error updating category:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update category.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Enter the new name for the category. This will update it across all your transactions and budgets.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
