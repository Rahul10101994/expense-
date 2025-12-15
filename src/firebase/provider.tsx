'use client';

import { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';

export interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export function FirebaseProvider({
  children,
  firebaseApp,
}: {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
}) {
  const contextValue = {
    firebaseApp,
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  return useContext(FirebaseContext);
};

export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  return context.firebaseApp;
};
