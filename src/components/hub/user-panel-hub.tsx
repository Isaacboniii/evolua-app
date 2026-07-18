'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUserProfile } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { PanelHub } from './panel-hub';

/**
 * Hub do usuário comum. Quando ele é membro do painel de outra pessoa,
 * busca o perfil do dono só para exibir "Painel de <nome>" no herói —
 * deixa claro que os dados vistos não são os dele.
 */
export function UserPanelHub() {
  const firestore = useFirestore();
  const { profile } = useUserProfile();
  const panelOwnerId = profile?.panelOwnerId;

  const [ownerName, setOwnerName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!firestore || !panelOwnerId) {
      setOwnerName(undefined);
      return;
    }

    // getDoc pontual em vez de listener: o nome do dono é estável e o rótulo
    // é cosmético. Se a leitura falhar, o hub apenas fica sem o badge.
    let cancelled = false;
    getDoc(doc(firestore, 'users', panelOwnerId))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const owner = snap.data() as UserProfile;
        setOwnerName(owner.displayName);
      })
      .catch(() => {
        if (!cancelled) setOwnerName(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [firestore, panelOwnerId]);

  return <PanelHub basePath="" panelName={ownerName} />;
}
