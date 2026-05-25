'use client';

import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectPage() {
    const { profile, loading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (profile?.role === 'admin') {
            router.replace('/admin');
        } else {
            router.replace('/');
        }
    }, [profile, loading, router]);

    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
}
