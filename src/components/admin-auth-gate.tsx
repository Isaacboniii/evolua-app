'use client';

import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
        router.replace('/login');
        return;
    }
    if (profile && profile.role !== 'admin') {
      router.replace('/');
    }
  }, [profile, loading, user, router]);

  if (loading || !profile || profile.role !== 'admin') {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background p-8">
            <div className="flex items-center mb-6">
                <Skeleton className="h-10 w-1/4" />
            </div>
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Skeleton className="h-96 w-full" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
