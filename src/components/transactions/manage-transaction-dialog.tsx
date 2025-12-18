
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import AddTransactionForm from './add-transaction-form';
import type { Transaction } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

type ManageTransactionDialogProps = {
  transaction: Transaction;
  onTransactionUpdate: () => void;
  onTransactionDelete: () => void;
};

export default function ManageTransactionDialog({ transaction, onTransactionUpdate, onTransactionDelete }: ManageTransactionDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore || !user) return;

    try {
        const transactionRef = doc(firestore, `users/${user.uid}/accounts/${transaction.accountId}/transactions`, transaction.id);
        deleteDocumentNonBlocking(transactionRef);

        onTransactionDelete();
        toast({ title: 'Transaction Deleted', description: 'The transaction has been successfully deleted.' });
        setIsDeleteDialogOpen(false);
    } catch (error) {
        console.error("Error deleting transaction:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete transaction.' });
    }
  };


  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                 <AddTransactionForm transactionToEdit={transaction} onTransactionAdded={onTransactionUpdate}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                </AddTransactionForm>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );
}
