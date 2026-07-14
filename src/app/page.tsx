'use client'

import { PanelHub } from "@/components/hub/panel-hub";
import { AuthGate } from '@/components/auth-gate';

export default function HomePage() {
  return (
    <AuthGate>
      <PanelHub basePath="" />
    </AuthGate>
  );
}
