import React, { createContext, useContext, useState, useEffect } from 'react';
import { ensureFamily } from '../../lib/bootstrap';
import { subscribeProfiles } from '../../lib/repos/profiles.repo';
import { useLocalStorage } from '../../lib/config';
import { Profile } from '../../lib/types';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  familyId: string;
  profiles: Profile[];
  currentProfile: Profile | null;
  isParent: boolean;
  selectProfile: (profileId: string) => void;
  clearProfile: () => void;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mapping, authLoading } = useAuth();
  const [familyId, setFamilyId] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Local mode: seeded demo family + manual profile picking (pre-Phase-4 behavior).
  useEffect(() => {
    if (!useLocalStorage) return;

    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        const id = await ensureFamily();
        setFamilyId(id);

        unsubscribe = subscribeProfiles(id, (updatedProfiles) => {
          setProfiles(updatedProfiles);

          // Resolve current profile from localStorage
          const activeProfileId = localStorage.getItem('active_profile_id');
          if (activeProfileId) {
            const found = updatedProfiles.find(p => p.id === activeProfileId);
            setCurrentProfile(found || null);
          } else {
            setCurrentProfile(null);
          }
          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to initialize ProfileContext:', err);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Live mode: identity comes from the auth mapping — the signed-in user IS
  // their profile (Phase 4 D1). No picker, no localStorage selection.
  useEffect(() => {
    if (useLocalStorage) return;
    if (authLoading) return;

    if (!mapping) {
      setFamilyId('');
      setProfiles([]);
      setCurrentProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFamilyId(mapping.familyId);
    const unsubscribe = subscribeProfiles(mapping.familyId, (updatedProfiles) => {
      setProfiles(updatedProfiles);
      setCurrentProfile(updatedProfiles.find(p => p.id === mapping.profileId) || null);
      setLoading(false);
    });

    return unsubscribe;
  }, [mapping, authLoading]);

  const selectProfile = (profileId: string) => {
    if (!useLocalStorage) return; // live mode: identity is bound to the account
    localStorage.setItem('active_profile_id', profileId);
    const found = profiles.find(p => p.id === profileId);
    setCurrentProfile(found || null);
  };

  const clearProfile = () => {
    if (!useLocalStorage) return;
    localStorage.removeItem('active_profile_id');
    setCurrentProfile(null);
  };

  const isParent = currentProfile?.role === 'parent';

  return (
    <ProfileContext.Provider
      value={{
        familyId,
        profiles,
        currentProfile,
        isParent,
        selectProfile,
        clearProfile,
        loading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
