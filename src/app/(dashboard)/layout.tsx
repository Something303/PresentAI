'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, MobileTopBar, MobileBottomNav } from '@/components/layout/Sidebar';
import { LoadingState } from '@/components/ui/States';
import { isDemoMode } from '@/lib/config';
import { DemoBanner } from '@/components/ui/States';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingState size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar */}
      <MobileTopBar />

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pb-20 lg:pb-0">
          {/* Demo mode banner */}
          {isDemoMode && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
              <DemoBanner />
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
