
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Goal } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Goal name must be at least 2 characters.',
  }),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative(),
  targetDate: z.date(),
});

type AddGoalFormProps = {
  goal?: Goal;
  children: React.ReactNode;
};

export default function AddGoalForm({ goal, children }: AddGoalFormProps) {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  const goalsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/goals`);
  }, [firestore, user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: goal ? {
        ...goal,
        targetDate: new Date(goal.targetDate)
    } : {
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!goalsCollection || !user) return;
    
    const goalData = {
      ...values,
      targetDate: values.targetDate.toISOString(),
      userId: user.uid,
    };

    if(goal && goal.id) {
        const goalDoc = doc(goalsCollection, goal.id);
        setDocumentNonBlocking(goalDoc, goalData, { merge: true });
    } else {
        addDocumentNonBlocking(goalsCollection, goalData);
    }
    
    setOpen(false);
    form.reset();
  }

  const handleDelete = () => {
    if(!goalsCollection || !goal || !goal.id) return;
    const goalDoc = doc(goalsCollection, goal.id);
    deleteDocumentNonBlocking(goalDoc);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Update the details of your financial goal.' : 'Enter the details for your new financial goal.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Buy a new car" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 20000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="currentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Amount Saved</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Target Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter className="flex justify-between w-full">
                {goal && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" type="button"><Trash2/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your goal.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              <Button type="submit">{goal ? 'Save Changes' : 'Add Goal'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
