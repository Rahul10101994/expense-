

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { categories } from '@/lib/data';
import { CategoryIcon } from '@/lib/icons';
import { PlusCircle, Trash2, Download } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function SettingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts/default/transactions`);
    }, [firestore, user]);

    const { data: transactions } = useCollection<Transaction>(transactionsQuery);

    const handleDownload = () => {
        if (!transactions) return;

        const headers = ["Date", "Description", "Category", "Type", "Amount"];
        const csvRows = [headers.join(",")];

        for (const transaction of transactions) {
            const values = [
                new Date(transaction.date).toLocaleDateString(),
                `"${transaction.description.replace(/"/g, '""')}"`,
                transaction.category,
                transaction.type,
                transaction.amount
            ];
            csvRows.push(values.join(","));
        }

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `transactions-report.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

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
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download All Transactions
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
                                <Input placeholder="New category name" />
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Category</Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <CategoryIcon category={category} className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                      </SheetContent>
                    </Sheet>
                </CardContent>
            </Card>
        </div>
    );
}
