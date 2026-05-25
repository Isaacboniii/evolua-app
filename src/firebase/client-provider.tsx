"use client";

import { useEffect, useState } from "react";
import { initializeFirebase } from ".";
import { FirebaseProvider, type FirebaseContextValue } from "./provider";

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firebase, setFirebase] = useState<FirebaseContextValue>({
    app: null,
    auth: null,
    firestore: null,
    storage: null,
  });

  useEffect(() => {
    const instances = initializeFirebase();
    setFirebase(instances);
  }, []);

  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
