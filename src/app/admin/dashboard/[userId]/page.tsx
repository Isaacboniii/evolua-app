'use client';

import { use } from 'react';
import { AdminAuthGate } from '@/components/admin-auth-gate';
import { PanelHub } from '@/components/hub/panel-hub';

export default function AdminPanelHubPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);

  return (
    <AdminAuthGate>
      <PanelHub
        basePath={`/admin/dashboard/${userId}`}
        backHref="/admin"
        backLabel="Painéis"
      />
    </AdminAuthGate>
  );
}
