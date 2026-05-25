'use client';
import { useEffect, useState } from 'react';
import { useUser } from './use-user';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '../provider';
import type { UserProfile } from '@/lib/types';

export const useUserProfile = () => {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Se a autenticação ainda está carregando ou não há usuário, não carregue o perfil
    if (authLoading) return;

    if (!user || !firestore) {
      setProfileLoading(false);
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ id: snapshot.id, ...snapshot.data() } as UserProfile);
        } else {
          // Documento não existe (Usuário novo sem perfil no DB ainda)
          setProfile(null);
        }
        setProfileLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("Erro ao ler perfil do usuário (Firestore não inicializado ou regras de acesso falharam):", err);
        setProfile(null);
        setProfileLoading(false);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [user, firestore, authLoading]);

  // Se o Firebase Auth está carregando, seguramos o estado global de loading
  return { 
    user, 
    profile, 
    loading: authLoading || profileLoading, 
    error 
  };
};
