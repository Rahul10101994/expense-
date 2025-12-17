
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AddCategoryForm() {
    const [open, setOpen] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [categoryType, setCategoryType] = useState<'income' | 'expense' | 'investment'>('expense');
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const handleAddCategory = async () => {
        if (!newCategory.trim() || !user || !firestore) return;
        try {
            await addDoc(collection(firestore, `users/${user.uid}/categories`), {
                name: newCategory.trim(),
                userId: user.uid,
                type: categoryType
            });
            toast({ title: "Category added", description: `"${newCategory}" has been added.` });
            setNewCategory('');
            setOpen(false);
        } catch (error) {
            console.error("Error adding category:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not add category." });
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                <SheetTitle>Add a New Category</SheetTitle>
                <SheetDescription>
                    Create a new category to organize your transactions.
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <Input 
                        placeholder="Category Name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Select value={categoryType} onValueChange={(v) => setCategoryType(v as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                        Save Category
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

