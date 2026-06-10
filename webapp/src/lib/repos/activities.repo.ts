import { onSnapshot, query, where, orderBy, doc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { activitiesCol, activityDoc } from '../paths';
import { Activity } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeActivities(familyId: string, cb: (a: Activity[]) => void) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const active = data.filter(act => act.status === 'active');
      // Sort descending by createdAt (newest first)
      active.sort((a, b) => b.createdAt - a.createdAt);
      cb(active);
    };
    load();
    return subscribeToKey(`activities_${familyId}`, load);
  }

  const q = query(
    activitiesCol(familyId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const activities: Activity[] = [];
    snapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() } as Activity);
    });
    cb(activities);
  });
}

export async function createActivity(
  familyId: string,
  input: {
    title: string;
    description?: string;
    durationMinutes?: number;
    tokenValue: number;
    assignedKidIds: string[];
    createdByProfileId: string;
  }
): Promise<string> {
  if (useLocalStorage) {
    const list = getStorageItem<Activity[]>(`activities_${familyId}`, []);
    const newId = `activity_${Math.random().toString(36).substr(2, 9)}`;
    const newActivity: Activity = {
      id: newId,
      familyId,
      title: input.title,
      description: input.description || '',
      durationMinutes: input.durationMinutes,
      tokenValue: input.tokenValue,
      assignedKidIds: input.assignedKidIds,
      status: 'active',
      createdByProfileId: input.createdByProfileId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    list.push(newActivity);
    setStorageItem(`activities_${familyId}`, list);
    notifyKey(`activities_${familyId}`);
    return newId;
  }

  const colRef = activitiesCol(familyId);
  const newDocRef = doc(colRef);
  const activityId = newDocRef.id;

  const activity: Activity = {
    id: activityId,
    familyId,
    title: input.title,
    description: input.description || '',
    durationMinutes: input.durationMinutes,
    tokenValue: input.tokenValue,
    assignedKidIds: input.assignedKidIds,
    status: 'active',
    createdByProfileId: input.createdByProfileId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(newDocRef, activity);
  return activityId;
}

export async function updateActivity(
  familyId: string,
  id: string,
  patch: Partial<Pick<Activity, 'title' | 'description' | 'durationMinutes' | 'tokenValue' | 'assignedKidIds'>>
): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<Activity[]>(`activities_${familyId}`, []);
    const updated = list.map(act => {
      if (act.id === id) {
        return {
          ...act,
          ...patch,
          updatedAt: Date.now(),
        };
      }
      return act;
    });
    setStorageItem(`activities_${familyId}`, updated);
    notifyKey(`activities_${familyId}`);
    return;
  }

  const ref = activityDoc(familyId, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function archiveActivity(familyId: string, id: string): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<Activity[]>(`activities_${familyId}`, []);
    const updated = list.map(act => {
      if (act.id === id) {
        return {
          ...act,
          status: 'archived' as const,
          updatedAt: Date.now(),
        };
      }
      return act;
    });
    setStorageItem(`activities_${familyId}`, updated);
    notifyKey(`activities_${familyId}`);
    return;
  }

  const ref = activityDoc(familyId, id);
  await updateDoc(ref, {
    status: 'archived',
    updatedAt: Date.now(),
  });
}
