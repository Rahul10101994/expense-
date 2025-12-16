
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  PiggyBank,
  Settings,
  Plus,
  Landmark,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AddTransactionForm from '@/components/transactions/add-transaction-form';
import type { Transaction } from '@/lib/types';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppBottomNav() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user } = useUser();

   const transactionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/accounts/default/transactions`);
    }, [firestore, user]);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'accountId'>) => {
    if (!transactionsQuery) return;
    
    const transactionData = {
        ...newTransaction,
        accountId: 'default',
    };
    addDocumentNonBlocking(transactionsQuery, transactionData);
  };


  return (
    <>
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        <AddTransactionForm onAddTransaction={handleAddTransaction}>
          <button className="bg-primary text-primary-foreground rounded-full h-14 w-14 flex items-center justify-center shadow-lg">
            <Plus className="h-6 w-6" />
          </button>
        </AddTransactionForm>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm z-40 md:hidden">
        <nav className="grid grid-cols-5 items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
