import React, { createContext, useContext, useState, useEffect } from 'react';
import { ensureFamily } from '../../lib/bootstrap';
import { subscribeProfiles } from '../../lib/repos/profiles.repo';
import { Profile } from '../../lib/types';

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
  const [familyId, setFamilyId] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        const id = await ensureFamily();
        setFamilyId(id);

        // Subscribe to profiles
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

  const selectProfile = (profileId: string) => {
    localStorage.setItem('active_profile_id', profileId);
    const found = profiles.find(p => p.id === profileId);
    setCurrentProfile(found || null);
  };

  const clearProfile = () => {
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
