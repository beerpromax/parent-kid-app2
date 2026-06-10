import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '../../lib/firebase';
import { userDoc } from '../../lib/paths';
import { useLocalStorage } from '../../lib/config';
import { UserMapping } from '../../lib/types';

interface AuthContextType {
  firebaseUser: User | null;
  mapping: UserMapping | null;
  authLoading: boolean;
  refreshMapping: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [mapping, setMapping] = useState<UserMapping | null>(null);
  // Local mode never authenticates, so it starts (and stays) resolved.
  const [authLoading, setAuthLoading] = useState(!useLocalStorage);

  async function loadMapping(user: User): Promise<UserMapping | null> {
    try {
      const snap = await getDoc(userDoc(user.uid));
      return snap.exists() ? (snap.data() as UserMapping) : null;
    } catch (err) {
      console.error('Failed to load user mapping:', err);
      return null;
    }
  }

  useEffect(() => {
    if (useLocalStorage) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setMapping(user ? await loadMapping(user) : null);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // After signup/claim the mapping doc lands post-onAuthStateChanged; callers
  // can force a re-read without waiting for an auth event.
  const refreshMapping = async () => {
    if (auth.currentUser) {
      setMapping(await loadMapping(auth.currentUser));
      setFirebaseUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, mapping, authLoading, refreshMapping }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
