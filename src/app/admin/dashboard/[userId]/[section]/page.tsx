'use client';

import { use } from 'react';
import { AdminAuthGate } from '@/components/admin-auth-gate';
import { PanelSectionRenderer } from '@/components/hub/panel-section-renderer';

export default function AdminPanelSectionPage({
  params,
}: {
  params: Promise<{ userId: string; section: string }>;
}) {
  const { userId, section } = use(params);

  return (
    <AdminAuthGate>
      <PanelSectionRenderer
        section={section}
        userId={userId}
        isReadOnly
        basePath={`/admin/dashboard/${userId}`}
      />
    </AdminAuthGate>
  );
}
