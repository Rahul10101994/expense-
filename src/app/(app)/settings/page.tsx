
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryIcon } from '@/lib/icons';
import { PlusCircle, Trash2, Download, AlertTriangle } from 'lucide-react';
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
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isSameMonth, isSameYear, getYear, getMonth, format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

type Period = 'currentMonth' | 'currentYear' | 'overall' | 'custom';
type ClearScope = 'all' | 'period';

export default function SettingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [period, setPeriod] = useState<Period>('currentMonth');
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
    const [newCategory, setNewCategory] = useState('');
    const [isClearing, setIsClearing] = useState(false);
    const [clearScope, setClearScope] = useState<ClearScope>('all');

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts/default/transactions`);
    }, [firestore, user]);

    const { data: transactions } = useCollection<Transaction>(transactionsQuery);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/categories`);
    }, [firestore, user]);

    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
    
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

        const headers = ["Date", "Type", "Amount", "Category", "Description"];
        const csvRows = [headers.join(",")];

        for (const transaction of filteredTransactions) {
            const values = [
                new Date(transaction.date).toLocaleDateString(),
                transaction.type,
                transaction.amount,
                transaction.category,
                `"${transaction.description.replace(/"/g, '""')}"`,
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
        } catch (error) {
            console.error("Error adding category:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not add category." });
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        if (!user || !firestore) return;
        try {
            await deleteDoc(doc(firestore, `users/${user.uid}/categories`, categoryId));
            toast({ title: "Category deleted", description: `"${categoryName}" has been deleted.` });
        } catch (error) {
            console.error("Error deleting category:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not delete category." });
        }
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
                    querySnapshot.forEach(doc => batch.delete(doc.ref));
                }
                
                // Also clear the transactions subcollection for the 'default' account
                const defaultTransactionsRef = collection(firestore, `users/${user.uid}/accounts/default/transactions`);
                const transactionsSnapshot = await getDocs(defaultTransactionsRef);
                transactionsSnapshot.forEach(transactionDoc => batch.delete(transactionDoc.ref));

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

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Manage your application settings.</CardDescription>
                </CardHeader>
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
                    <Sheet>
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

    