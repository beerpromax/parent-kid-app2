import { onSnapshot, query, getDoc, setDoc, doc, collection, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { profilesCol, profileDoc } from '../paths';
import { Profile } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeProfiles(familyId: string, cb: (p: Profile[]) => void) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
      cb(data);
    };
    load();
    return subscribeToKey(`profiles_${familyId}`, load);
  }

  const q = query(profilesCol(familyId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const profiles: Profile[] = [];
    snapshot.forEach((doc) => {
      profiles.push({ id: doc.id, ...doc.data() } as Profile);
    });
    cb(profiles);
  });
}

export async function getProfile(familyId: string, profileId: string): Promise<Profile | null> {
  if (useLocalStorage) {
    const list = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    return list.find(p => p.id === profileId) || null;
  }

  const ref = profileDoc(familyId, profileId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Profile;
  }
  return null;
}

export async function createProfile(
  familyId: string, 
  input: Pick<Profile, 'name' | 'role' | 'color' | 'emoji'>
): Promise<string> {
  if (useLocalStorage) {
    const list = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const newId = `profile_${Math.random().toString(36).substr(2, 9)}`;
    const newProfile: Profile = {
      id: newId,
      familyId,
      name: input.name,
      role: input.role,
      color: input.color,
      emoji: input.emoji,
      tokenBalance: 0,
      createdAt: Date.now(),
    };
    list.push(newProfile);
    setStorageItem(`profiles_${familyId}`, list);
    notifyKey(`profiles_${familyId}`);
    return newId;
  }

  const colRef = profilesCol(familyId);
  const newDocRef = doc(colRef);
  const profileId = newDocRef.id;

  const profile: Profile = {
    id: profileId,
    familyId,
    name: input.name,
    role: input.role,
    color: input.color,
    emoji: input.emoji,
    tokenBalance: 0,
    createdAt: Date.now(),
  };

  await setDoc(newDocRef, profile);
  return profileId;
}
