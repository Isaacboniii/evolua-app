'use client';

import { useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAt,
  startAfter,
  endAt,
  endBefore,
  type CollectionReference,
  type DocumentReference,
  type Query,
  type Firestore,
} from 'firebase/firestore';

// This is a helper function to create a consistent dependency array for useMemo
// It stringifies the query constraints to ensure that the memoization works correctly
// even if the constraint objects are different instances.
const getDeps = (constraints: any[]): string => {
    // Create a stable string key from the constraints.
    // JSON.stringify can be unstable for complex objects, so we try to create a
    // simpler representation first. This is a bit of a hack and relies on
    // internal-like properties of Firebase's query constraints.
    try {
        const simplifiedConstraints = constraints.map(c => {
            if (c && typeof c === 'object' && 'type' in c) {
                const c_any = c as any;
                // Attempt to build a string from common constraint properties
                return `${c_any.type}_${c_any._op}_${c_any._fieldPath?.toString()}_${JSON.stringify(c_any._value)}`;
            }
            return c;
        });
        return JSON.stringify(simplifiedConstraints);
    } catch {
        // Fallback if the above fails
        return String(Date.now());
    }
};


export const useMemoCollection = (
  firestore: Firestore | null,
  path: string | null,
  ...constraints: any[]
): CollectionReference | null => {
  const depsKey = getDeps(constraints);
  return useMemo(() => {
    if (!firestore || !path) return null;
    return collection(firestore, path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, depsKey]);
};

export const useMemoDoc = (
  firestore: Firestore | null,
  path: string | null,
  ...constraints: any[]
): DocumentReference | null => {
  const depsKey = getDeps(constraints);
  return useMemo(() => {
    if (!firestore || !path) return null;
    return doc(firestore, path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, depsKey]);
};

export const useMemoQuery = (
  firestore: Firestore | null,
  path: string | null,
  ...constraints: any[]
): Query | null => {
  const depsKey = getDeps(constraints);
  return useMemo(() => {
    if (!firestore || !path) return null;
    const coll = collection(firestore, path);
    // Filter out any null or undefined constraints before applying them
    const validConstraints = constraints.filter(c => c);
    return query(coll, ...validConstraints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, depsKey]);
};
