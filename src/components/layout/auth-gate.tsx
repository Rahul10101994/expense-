
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import AppSidebar from '@/components/layout/app-sidebar';
import AppBottomNav from '@/components/layout/app-bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, userError } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!isUserLoading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, isAuthPage, pathname]);

  useEffect(() => {
    if (userError) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: userError.message,
      });
    }
  }, [userError, toast]);

  if (isUserLoading || (!user && !isAuthPage)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }
  
  if (isAuthPage) {
    return <>{children}</>;
  }


  if (isMobile) {
    return (
      <>
        <main className="pb-24 p-4">{children}</main>
        <AppBottomNav />
      </>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
