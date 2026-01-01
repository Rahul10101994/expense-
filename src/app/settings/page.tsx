
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryIcon } from '@/lib/icons';
import { PlusCircle, Trash2, Download, AlertTriangle, FileText, Landmark, Edit } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, addDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import type { Transaction, Category, Account, Budget, Goal } from '@/lib/types';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isSameMonth, isSameYear, getYear, getMonth, format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import EditCategoryForm from '@/components/categories/edit-category-form';

type Period = 'currentMonth' | 'currentYear' | 'overall' | 'custom';
type ClearScope = 'all' | 'period';

function ManageCategoriesSheet({ onDataChanged }: { onDataChanged: () => void }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [newCategory, setNewCategory] = useState('');
    const [open, setOpen] = useState(false);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/categories`);
    }, [firestore, user]);

    const { data: categories, isLoading: categoriesLoading, error } = useCollection<Category>(categoriesQuery);

    const handleAddCategory = async () => {
        if (!newCategory.trim() || !user || !firestore) return;
        try {
            await addDoc(collection(firestore, `users/${user.uid}/categories`), {
                name: newCategory.trim(),
                userId: user.uid,
                type: 'expense' // Defaulting to expense, can be changed later
            });
            toast({ title: "Category added", description: `"${newCategory}" has been added.` });
            setNewCategory('');
            onDataChanged();
            setOpen(false);
        } catch (error) {
            console.error("Error adding category:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not add category." });
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);

            const categoryDocRef = doc(firestore, `users/${user.uid}/categories`, categoryId);
            batch.delete(categoryDocRef);
            
            const budgetsQuery = query(collection(firestore, `users/${user.uid}/budgets`), where('categoryId', '==', categoryName));
            const budgetsSnapshot = await getDocs(budgetsQuery);
            budgetsSnapshot.forEach(budgetDoc => {
                batch.delete(budgetDoc.ref);
            });
            
            await batch.commit();

            toast({ title: "Category deleted", description: `"${categoryName}" and its associated budgets have been deleted.` });
            onDataChanged();
        } catch (error) {
            console.error("Error deleting category and budgets:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete category." });
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>Manage Categories</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Manage Categories</SheetTitle>
                    <SheetDescription>
                        Add, edit, or delete your spending, income, and investment categories.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <div className="flex space-x-2 mb-4">
                        <Input
                            placeholder="New category name"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button onClick={handleAddCategory}><PlusCircle className="mr-2 h-4 w-4" /> Add Category</Button>
                    </div>
                    {categoriesLoading ? <div className="flex justify-center"><Spinner /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories?.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <CategoryIcon category={category.name} className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{category.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditCategoryForm category={category} onCategoryChanged={onDataChanged}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </EditCategoryForm>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id, category.name)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}


export default function SettingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [period, setPeriod] = useState<Period>('currentMonth');
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
    const [isClearing, setIsClearing] = useState(false);
    const [clearScope, setClearScope] = useState<ClearScope>('all');
    const [refreshKey, setRefreshKey] = useState(0);
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const fetchedAccounts: Account[] = [];
        const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
        accountsSnapshot.forEach(doc => {
            fetchedAccounts.push({ id: doc.id, ...doc.data() } as Account);
        });
        
        const fetchedTransactions: Transaction[] = [];
        for (const account of fetchedAccounts) {
            const transactionsColRef = collection(firestore, `users/${user.uid}/accounts/${account.id}/transactions`);
            const transactionsSnapshot = await getDocs(transactionsColRef);
            transactionsSnapshot.forEach(doc => {
                fetchedTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
            });
        }
        setTransactions(fetchedTransactions);
        setIsLoading(false);
    }, [user, firestore]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, refreshKey]);
    
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        const now = new Date();
        if (period === 'currentMonth') {
            return transactions.filter(t => isSameMonth(new Date(t.date), now));
        }
        if (period === 'currentYear') {
            return transactions.filter(t => isSameYear(new Date(t.date), now));
        }
        if (period === 'custom') {
            return transactions.filter(t => {
                const date = new Date(t.date);
                return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
            });
        }
        return transactions;
    }, [transactions, period, selectedYear, selectedMonth]);

    const getReportTitle = () => {
        if (period === 'currentMonth') return 'This Month';
        if (period === 'currentYear') return 'This Year';
        if (period === 'custom') return format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
        return 'Overall';
    }

    const handleDownload = () => {
        if (!filteredTransactions) return;

        const headers = ["Date", "Type", "Amount", "Category", "Description", "Need/Want"];
        const csvRows = [headers.join(",")];

        for (const transaction of filteredTransactions) {
            const values = [
                format(new Date(transaction.date), 'dd-MM-yyyy'),
                transaction.type,
                transaction.amount,
                transaction.category,
                `"${transaction.description.replace(/"/g, '""')}"`,
                transaction.expenseType || '',
            ];
            csvRows.push(values.join(","));
        }

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `transactions-report-${getReportTitle().toLowerCase().replace(/\s/g, '-')}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleClearRecords = async () => {
        if (!user || !firestore) return;
        setIsClearing(true);

        try {
            const batch = writeBatch(firestore);

            if (clearScope === 'all') {
                const collectionsToDelete = ['accounts', 'budgets', 'categories', 'goals'];
                for (const col of collectionsToDelete) {
                    const querySnapshot = await getDocs(collection(firestore, `users/${user.uid}/${col}`));
                    for (const doc of querySnapshot.docs) {
                        // Special handling for accounts to delete subcollections
                        if (col === 'accounts') {
                            const transactionsSnapshot = await getDocs(collection(doc.ref, 'transactions'));
                            transactionsSnapshot.forEach(transactionDoc => batch.delete(transactionDoc.ref));
                        }
                        batch.delete(doc.ref);
                    }
                }
            } else {
                 let startDate: Date;
                 let endDate: Date;
                 const now = new Date();

                 if (period === 'currentMonth') {
                     startDate = startOfMonth(now);
                     endDate = endOfMonth(now);
                 } else if (period === 'currentYear') {
                     startDate = new Date(getYear(now), 0, 1);
                     endDate = new Date(getYear(now), 11, 31, 23, 59, 59);
                 } else if (period === 'custom') {
                     startDate = startOfMonth(new Date(selectedYear, selectedMonth));
                     endDate = endOfMonth(new Date(selectedYear, selectedMonth));
                 } else { // overall
                     startDate = new Date(0); // very old date
                     endDate = new Date();
                 }

                const accountsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/accounts`));
                for (const accountDoc of accountsSnapshot.docs) {
                    const transactionsQuery = query(
                        collection(accountDoc.ref, 'transactions'),
                        where('date', '>=', startDate.toISOString()),
                        where('date', '<=', endDate.toISOString())
                    );
                    const transactionsSnapshot = await getDocs(transactionsQuery);
                    transactionsSnapshot.forEach(transactionDoc => batch.delete(transactionDoc.ref));
                }
            }

            await batch.commit();
            toast({ title: "Records Cleared", description: "Selected data has been successfully cleared." });
            setRefreshKey(k => k + 1);
        } catch (error) {
            console.error("Error clearing records:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not clear records." });
        } finally {
            setIsClearing(false);
        }
    };


    const yearOptions = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i), 'MMMM') }));
    
    const getClearDescription = () => {
        if (clearScope === 'all') {
            return "This action cannot be undone. This will permanently delete all your accounts, transactions, budgets, goals, and categories from our servers.";
        }
        return `This action cannot be undone. This will permanently delete all transactions for ${getReportTitle()}. Other data will not be affected.`;
    }

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Spinner size="large" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Manage your application settings and reports.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Accounts</CardTitle>
                    <CardDescription>View and manage your connected financial accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/accounts">
                        <Button variant="outline">
                            <Landmark className="mr-2 h-4 w-4" />
                            Manage Accounts
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>View Reports</CardTitle>
                    <CardDescription>View detailed financial reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/settings/reports">
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            View Reports
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Data Export</CardTitle>
                    <CardDescription>Download your transaction data as a CSV file.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 items-center">
                         <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                            <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="currentMonth">This Month</SelectItem>
                                <SelectItem value="currentYear">This Year</SelectItem>
                                <SelectItem value="overall">Overall</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                        {period === 'custom' && (
                            <>
                                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                    <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                    <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                        <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                    </div>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Report for {getReportTitle()}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Categories</CardTitle>
                </CardHeader>
                <CardContent>
                   <ManageCategoriesSheet onDataChanged={() => setRefreshKey(k => k + 1)} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Clear Data</CardTitle>
                    <CardDescription>Permanently delete financial records. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-wrap gap-2 items-center">
                         <Select value={clearScope} onValueChange={(v) => setClearScope(v as ClearScope)}>
                            <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                <SelectValue placeholder="Select scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Records</SelectItem>
                                <SelectItem value="period">By Period</SelectItem>
                            </SelectContent>
                        </Select>
                        {clearScope === 'period' && (
                            <>
                                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                                    <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                        <SelectValue placeholder="Select period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="currentMonth">This Month</SelectItem>
                                        <SelectItem value="currentYear">This Year</SelectItem>
                                        <SelectItem value="overall">Overall (All Transactions)</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                                {period === 'custom' && (
                                    <>
                                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                            <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                                <SelectValue placeholder="Select year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {yearOptions.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                            <SelectTrigger className="h-9 text-xs w-full sm:w-auto">
                                                <SelectValue placeholder="Select month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monthOptions.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Records
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {getClearDescription()}
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearRecords} disabled={isClearing}>
                                {isClearing ? <Spinner className="mr-2" /> : null}
                                Yes, delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
