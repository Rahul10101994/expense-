
'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import AppSidebar from '@/components/layout/app-sidebar';
import AppBottomNav from '@/components/layout/app-bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';


function AppContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
  }, [user, isUserLoading, router, isAuthPage]);

  useEffect(() => {
    if (userError) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: userError.message,
      });
    }
  }, [userError, toast]);
  
  if (isAuthPage) {
    if (isUserLoading || user) {
      return (
        <div className="flex h-screen w-screen items-center justify-center">
          <Spinner size="large" />
        </div>
      );
    }
    return <>{children}</>;
  }

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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <title>FinanceFlow</title>
        <meta name="description" content="Your personal finance dashboard." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
            <AppContent>{children}</AppContent>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
