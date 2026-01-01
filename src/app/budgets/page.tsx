
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/lib/icons';
import BudgetGoals from '@/components/dashboard/budget-goals';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { Transaction, Budget, Account, Category } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import SpendingBreakdownChart from '@/components/dashboard/spending-breakdown-chart';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import EditCategoryForm from '@/components/categories/edit-category-form';
import { useToast } from '@/hooks/use-toast';


export default function BudgetsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const currentMonth = useMemo(() => new Date(), []);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const pathname = usePathname(); // Using pathname to trigger re-fetch on navigation
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchAllData = useCallback(async () => {
        if (!user || !firestore) {
            setTransactionsLoading(false);
            setAccountsLoading(false);
            return;
        }

        setAccountsLoading(true);
        const accountsQuery = query(collection(firestore, `users/${user.uid}/accounts`));
        const accountsSnapshot = await getDocs(accountsQuery);
        const fetchedAccounts: Account[] = [];
        accountsSnapshot.forEach(doc => {
            fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
        });
        setAccounts(fetchedAccounts);
        setAccountsLoading(false);

        setTransactionsLoading(true);
        const allTransactions: Transaction[] = [];
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        for (const account of fetchedAccounts) {
            const transactionsQuery = query(
                collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`),
                where('date', '>=', monthStart.toISOString()),
                where('date', '<=', monthEnd.toISOString())
            );
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => {
                allTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
            });
        }
        setTransactions(allTransactions);
        setTransactionsLoading(false);
    }, [user, firestore, currentMonth]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, pathname, refreshKey]); // Re-fetch when page is visited or refreshKey changes

    const budgetsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        const monthStart = startOfMonth(currentMonth).toISOString();
        return query(
            collection(firestore, `users/${user.uid}/budgets`),
            where('month', '==', monthStart),
        );
    }, [firestore, user, currentMonth, refreshKey]);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/categories`));
    }, [firestore, user, refreshKey]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    
    const { data: savedBudgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

    const budgets: Budget[] = useMemo(() => {
        if (!savedBudgets || !transactions) return [];
        
        const spendingByCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            const categoryKey = t.category || 'Other';
            acc[categoryKey] = (acc[categoryKey] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
        
        return savedBudgets
            .filter(budget => budget.amount && budget.amount > 0)
            .map(budget => ({
                id: budget.id,
                category: budget.categoryId as Transaction['category'],
                limit: budget.amount || 0,
                spent: spendingByCategory[budget.categoryId!] || 0,
                month: budget.month
        }));

    }, [savedBudgets, transactions]);


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const handleDataChanged = () => {
        setRefreshKey(k => k + 1);
    };

    const handleDeleteCategory = async (categoryName: string) => {
        if (!user || !firestore || !categories) return;
    
        const categoryToDelete = categories.find(c => c.name === categoryName);
        if (!categoryToDelete) {
            toast({ variant: 'destructive', title: "Error", description: "Category not found." });
            return;
        }

        try {
            const batch = writeBatch(firestore);

            // Delete category doc
            const categoryDocRef = doc(firestore, `users/${user.uid}/categories`, categoryToDelete.id);
            batch.delete(categoryDocRef);
            
            // Delete associated budgets
            const budgetsQuery = query(collection(firestore, `users/${user.uid}/budgets`), where('categoryId', '==', categoryName));
            const budgetsSnapshot = await getDocs(budgetsQuery);
            budgetsSnapshot.forEach(budgetDoc => {
                batch.delete(budgetDoc.ref);
            });
            
            await batch.commit();

            toast({ title: "Category deleted", description: `"${categoryName}" and its associated budgets have been deleted.` });
            handleDataChanged();
        } catch (error) {
            console.error("Error deleting category and budgets:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete category." });
        }
    };


    if (budgetsLoading || transactionsLoading || accountsLoading || categoriesLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between p-2">
                    <div>
                        <CardTitle>Budgets</CardTitle>
                        <CardDescription>Create and manage your monthly budgets.</CardDescription>
                    </div>
                    <Link href="/budget-planner">
                      <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Budget
                      </Button>
                    </Link>
                </CardHeader>
            </Card>

            <BudgetGoals budgets={budgets} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <SpendingBreakdownChart transactions={transactions || []} />
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Budget by Category</CardTitle>
                        <CardDescription>A detailed look at your spending against your budgets for {format(currentMonth, 'MMMM yyyy')}.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 md:grid-cols-2">
                        {budgets.length === 0 && (
                            <div className="text-center text-muted-foreground col-span-full py-8">
                                <p>You haven't set any budgets for this month.</p>
                                <Link href="/budget-planner" className="text-primary hover:underline">Set a budget now</Link>
                            </div>
                        )}
                        {budgets.map((budget) => {
                            const progress = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
                            const isOverBudget = progress >= 100;
                            const category = categories?.find(c => c.name === budget.category);

                            return (
                                <Card key={budget.id} className="p-3">
                                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                        <div className="flex items-center gap-2 font-medium">
                                            <CategoryIcon category={budget.category} className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate">{budget.category}</span>
                                        </div>
                                         {category && (
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <EditCategoryForm category={category} onCategoryChanged={handleDataChanged}>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                        </EditCategoryForm>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                 <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the "{category.name}" category and its associated budgets. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCategory(category.name)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <div className="text-muted-foreground text-xs">
                                            {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Progress value={progress} className={cn("h-2 flex-1", { '[&>div]:bg-destructive': isOverBudget })} />
                                        <span className={cn("text-xs font-medium w-12 text-right", isOverBudget ? "text-red-500" : "text-muted-foreground")}>
                                            {isOverBudget ? 'Over' : `${Math.round(100 - progress)}%`}
                                        </span>
                                    </div>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
