'use client';

import { AuthGate } from '@/components/auth-gate';
import { useActivePanel } from '@/firebase';
import { PanelSectionRenderer } from './panel-section-renderer';

/**
 * Casca das seções no contexto do cliente. Se o usuário é membro de outro
 * painel (panelOwnerId no perfil), renderiza o painel do dono em modo somente
 * leitura; caso contrário, o próprio painel com escrita liberada.
 */
export function UserSectionPage({ section }: { section: string }) {
  const { targetUserId, isReadOnly, loading } = useActivePanel();

  return (
    <AuthGate>
      {/* Aguarda o perfil: sem isso o membro veria um flash do próprio painel vazio
          antes de o panelOwnerId chegar do Firestore. */}
      {loading || !targetUserId ? (
        <div className="flex min-h-screen items-center justify-center">Carregando...</div>
      ) : (
        <PanelSectionRenderer
          section={section}
          userId={targetUserId}
          isReadOnly={isReadOnly}
          basePath=""
        />
      )}
    </AuthGate>
  );
}
