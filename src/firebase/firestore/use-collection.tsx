"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";

export const useCollection = <T,>(query: Query<DocumentData> | null) => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as unknown as T[];
        
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err: Error) => {
        console.warn("Firestore listener falhou ou requer permissões (useCollection):", err);
        setError(err);
        setLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
};
