'use client';

import { useUserProfile } from './use-user-profile';

/**
 * Resolve QUAL painel o usuário logado está vendo e se pode escrever nele.
 *
 * Regra única do produto: um membro (perfil com `panelOwnerId`) enxerga o painel
 * do dono. Se o admin o marcou como `panelRole === 'editor'`, ele pode escrever;
 * caso contrário é somente leitura. Quem não é membro vê o próprio painel com
 * escrita liberada. Centralizado aqui para não repetir essa decisão em cada rota.
 *
 * `loading` reflete o carregamento do perfil — a UI deve aguardá-lo antes de
 * renderizar, senão o membro vê um flash do próprio painel (vazio, editável)
 * até o `panelOwnerId` chegar do Firestore.
 */
export function useActivePanel() {
  const { user, profile, loading } = useUserProfile();
  const panelOwnerId = profile?.panelOwnerId;
  const isMember = !!panelOwnerId;

  return {
    user,
    loading,
    targetUserId: panelOwnerId || user?.uid,
    // Membro só escreve se for editor; dono sempre escreve.
    isReadOnly: isMember && profile?.panelRole !== 'editor',
  };
}
