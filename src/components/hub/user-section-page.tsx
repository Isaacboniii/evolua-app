'use client';

import { AuthGate } from '@/components/auth-gate';
import { useUser } from '@/firebase';
import { PanelSectionRenderer } from './panel-section-renderer';

/**
 * Casca das seções no contexto do cliente: o dono do painel é o próprio usuário
 * logado, então nunca é read-only. A rota só informa qual seção renderizar.
 */
export function UserSectionPage({ section }: { section: string }) {
  const { user } = useUser();

  return (
    <AuthGate>
      {user ? (
        <PanelSectionRenderer section={section} userId={user.uid} isReadOnly={false} basePath="" />
      ) : (
        <div className="flex min-h-screen items-center justify-center">Carregando...</div>
      )}
    </AuthGate>
  );
}
