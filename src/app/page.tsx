'use client'

import { UserPanelHub } from "@/components/hub/user-panel-hub";
import { AuthGate } from '@/components/auth-gate';

export default function HomePage() {
  return (
    <AuthGate>
      <UserPanelHub />
    </AuthGate>
  );
}
