
'use client';

import { useState, useEffect } from 'react';
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
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Goal } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Edit, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Goal name must be at least 2 characters.',
  }),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().nonnegative().optional(),
  targetDate: z.date().optional(),
  type: z.enum(['saving', 'investment', 'need_spending', 'want_spending', 'long_term']),
  period: z.enum(['monthly', 'yearly', 'long_term']),
}).refine(data => data.period !== 'long_term' || data.type === 'long_term', {
    message: 'Type must be Long-Term for this period.',
    path: ['type'],
}).refine(data => data.period === 'long_term' || data.type !== 'long_term', {
    message: 'Select a recurring goal type.',
    path: ['type'],
});

type AddGoalFormProps = {
  goal?: Goal;
  children: React.ReactNode;
  onGoalChanged: () => void;
};

export default function AddGoalForm({ goal, children, onGoalChanged }: AddGoalFormProps) {
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
        targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
    } : {
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      period: 'long_term',
      type: 'long_term'
    },
  });

  const period = form.watch('period');

  useEffect(() => {
    if (period === 'long_term') {
      form.setValue('type', 'long_term');
    } else if (form.getValues('type') === 'long_term') {
      form.setValue('type', 'saving');
    }
  }, [period, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!goalsCollection || !user) return;
    
    const goalData: Partial<Goal> = {
      ...values,
      userId: user.uid,
      targetDate: values.targetDate ? values.targetDate.toISOString() : undefined,
      currentAmount: values.period === 'long_term' ? values.currentAmount || 0 : 0
    };
    
    if(goal && goal.id) {
        const goalDoc = doc(goalsCollection, goal.id);
        setDocumentNonBlocking(goalDoc, goalData, { merge: true });
    } else {
        addDocumentNonBlocking(goalsCollection, goalData as Goal);
    }
    
    setOpen(false);
    onGoalChanged();
    form.reset();
  }

  const handleDelete = () => {
    if(!goalsCollection || !goal || !goal.id) return;
    const goalDoc = doc(goalsCollection, goal.id);
    deleteDocumentNonBlocking(goalDoc);
    setOpen(false);
    onGoalChanged();
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
            {goal ? 'Update the details of your financial goal.' : 'Set a new target to work towards.'}
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
                    <Input placeholder="e.g., Vacation Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Period</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="long_term">Long-Term</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={period === 'long_term'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {period === 'long_term' ? (
                                    <SelectItem value="long_term">Long-Term Savings</SelectItem>
                                ) : (
                                    <>
                                    <SelectItem value="saving">Savings</SelectItem>
                                    <SelectItem value="investment">Investment</SelectItem>
                                    <SelectItem value="need_spending">"Needs" Spending</SelectItem>
                                    <SelectItem value="want_spending">"Wants" Spending</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

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

            {period === 'long_term' && (
                <>
                    <FormField
                    control={form.control}
                    name="currentAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Current Amount Saved</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 5000" {...field} value={field.value || 0} />
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
                </>
            )}
            
            <DialogFooter className="flex justify-between w-full !flex-row pt-4">
                {goal ? (
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
                ) : <div></div>}
              <Button type="submit">{goal ? 'Save Changes' : 'Add Goal'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    