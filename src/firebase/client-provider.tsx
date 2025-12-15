'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseProvider, type FirebaseContextValue } from './provider';
import { initializeFirebase } from '.';

const FirebaseClientContext = createContext<
  | {
      auth: Auth;
      firestore: Firestore;
    }
  | undefined
>(undefined);

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, auth, firestore } = useMemo(
    () => initializeFirebase(),
    []
  );

  const contextValue = {
    auth,
    firestore,
  };

  return (
    <FirebaseProvider firebaseApp={firebaseApp}>
      <FirebaseClientContext.Provider value={contextValue}>
        {children}
      </FirebaseClientContext.Provider>
    </FirebaseProvider>
  );
}

export const useAuth = () => {
  const context = useContext(FirebaseClientContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseClientProvider');
  }
  return context.auth;
};

export const useFirestore = () => {
  const context = useContext(FirebaseClientContext);
  if (context === undefined) {
    throw new Error(
      'useFirestore must be used within a FirebaseClientProvider'
    );
  }
  return context.firestore;
};
