
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import AddTransactionForm from './add-transaction-form';
import type { Transaction } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2 } from 'lucide-react';

type ManageTransactionDialogProps = {
  transaction: Transaction;
  onTransactionUpdate: (updatedTransaction: Transaction) => void;
  onTransactionDelete: (deletedTransactionId: string) => void;
};

export default function ManageTransactionDialog({ transaction, onTransactionUpdate, onTransactionDelete }: ManageTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!firestore || !user) return;

    try {
        const batch = writeBatch(firestore);
        const transactionRef = doc(firestore, `users/${user.uid}/accounts/${transaction.accountId}/transactions`, transaction.id);
        const accountRef = doc(firestore, `users/${user.uid}/accounts`, transaction.accountId);

        // Revert balance change
        // If it was income (positive), we subtract. If it was expense (negative), we add it back.
        batch.update(accountRef, { balance: -transaction.amount });
        batch.delete(transactionRef);
        
        await batch.commit();

        onTransactionDelete(transaction.id);
        toast({ title: 'Transaction Deleted', description: 'The transaction has been successfully deleted.' });
        setOpen(false);
    } catch (error) {
        console.error("Error deleting transaction:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete transaction.' });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        // Reset the view when dialog closes
        setShowEdit(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Manage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{showEdit ? 'Edit Transaction' : 'Manage Transaction'}</DialogTitle>
          <DialogDescription>
            {showEdit ? 'Update the details of your transaction.' : `What would you like to do with this transaction?`}
          </DialogDescription>
        </DialogHeader>

        {showEdit ? (
            <AddTransactionForm
                transactionToEdit={transaction}
                onAddTransaction={(t) => {
                    // This is a bit of a workaround as the form is for adding
                    // But we can treat it as an update here.
                    onTransactionUpdate({ ...t, id: transaction.id });
                    handleOpenChange(false);
                }}
            />
        ) : (
            <div className="flex justify-around py-8">
                <Button variant="outline" size="lg" onClick={() => setShowEdit(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="lg">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the transaction
                            and update the account balance.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
