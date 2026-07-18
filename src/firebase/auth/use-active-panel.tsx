'use client';

import { useUserProfile } from './use-user-profile';

/**
 * Resolve QUAL painel o usuário logado está vendo e se pode escrever nele.
 *
 * Regra única do produto: um membro (perfil com `panelOwnerId`) enxerga o painel
 * do dono em modo somente leitura; qualquer outro usuário vê o próprio painel com
 * escrita liberada. Centralizado aqui para não repetir essa decisão em cada rota.
 *
 * `loading` reflete o carregamento do perfil — a UI deve aguardá-lo antes de
 * renderizar, senão o membro vê um flash do próprio painel (vazio, editável)
 * até o `panelOwnerId` chegar do Firestore.
 */
export function useActivePanel() {
  const { user, profile, loading } = useUserProfile();
  const panelOwnerId = profile?.panelOwnerId;

  return {
    user,
    loading,
    targetUserId: panelOwnerId || user?.uid,
    isReadOnly: !!panelOwnerId,
  };
}
