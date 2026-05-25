'use client'

import { Dashboard } from "@/components/dashboard/dashboard";
import { AuthGate } from '@/components/auth-gate';
import { useUser } from '@/firebase';

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <AuthGate>
        {user ? <Dashboard userId={user.uid} /> : <div>Carregando...</div>}
    </AuthGate>
  );
}
