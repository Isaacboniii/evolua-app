'use client';
import { Dashboard } from '@/components/dashboard/dashboard';
import { AdminAuthGate } from '@/components/admin-auth-gate';
import { use } from 'react';

export default function AdminViewDashboardPage({ params }: { params: { userId: string } }) {
    const { userId } = use(params as any);
    return (
        <AdminAuthGate>
            <Dashboard userId={userId} />
        </AdminAuthGate>
    );
}
