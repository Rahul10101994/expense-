import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { categories } from '@/lib/data';
import { CategoryIcon } from '@/lib/icons';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function SettingsPage() {
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
                    <CardTitle>Manage Categories</CardTitle>
                    <CardDescription>Add, edit, or delete your spending, income, and investment categories.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    );
}
