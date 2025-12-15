'use client';

import AppSidebar from '@/components/layout/app-sidebar';
import AppBottomNav from '@/components/layout/app-bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <main className="pb-20">{children}</main>
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
