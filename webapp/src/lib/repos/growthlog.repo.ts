import { onSnapshot, query, where, orderBy, doc, updateDoc, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { growthLogCol, growthEntryDoc } from '../paths';
import { GrowthLogEntry, PhotoRef, MoodTag, EnergyTag } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';
import { deleteEntryPhoto, resolveLocalPhotoRefs } from '../storage';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

// Helper to resolve photos asynchronously for multiple entries in local mode
async function resolveLocalPhotoRefsForEntries(entries: GrowthLogEntry[]): Promise<GrowthLogEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const resolvedPhotos = await resolveLocalPhotoRefs(entry.photos);
      return {
        ...entry,
        photos: resolvedPhotos,
      };
    })
  );
}

function validateEntryInput(input: { activityContent: string; date: string; durationMinutes?: number }) {
  if (!input.activityContent || input.activityContent.trim() === '') {
    throw new Error('Activity content is required');
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Date is required in YYYY-MM-DD format');
  }
  if (input.durationMinutes !== undefined && input.durationMinutes !== null && input.durationMinutes < 0) {
    throw new Error('Duration must be greater than or equal to 0');
  }
}

export function subscribeGrowthLog(
  familyId: string,
  opts: { kidId: string; from?: string; to?: string },
  cb: (entries: GrowthLogEntry[]) => void
): () => void {
  if (useLocalStorage) {
    const load = async () => {
      const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
      let filtered = list.filter((e) => e.kidId === opts.kidId && e.status === 'active');
      if (opts.from) {
        filtered = filtered.filter((e) => e.date >= opts.from!);
      }
      if (opts.to) {
        filtered = filtered.filter((e) => e.date <= opts.to!);
      }
      // Sort date desc, createdAt desc
      filtered.sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return b.createdAt - a.createdAt;
      });
      const resolved = await resolveLocalPhotoRefsForEntries(filtered);
      cb(resolved);
    };
    load();
    return subscribeToKey(`growthLog_${familyId}`, load);
  }

  const q = query(
    growthLogCol(familyId),
    where('kidId', '==', opts.kidId),
    where('status', '==', 'active'),
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    let entries: GrowthLogEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() } as GrowthLogEntry);
    });
    if (opts.from) {
      entries = entries.filter((e) => e.date >= opts.from!);
    }
    if (opts.to) {
      entries = entries.filter((e) => e.date <= opts.to!);
    }
    cb(entries);
  });
}

// Subscription for ALL logs (useful for lists containing trashed items or for administrative lists)
export function subscribeAllGrowthLogs(
  familyId: string,
  opts: { kidId: string },
  cb: (entries: GrowthLogEntry[]) => void
): () => void {
  if (useLocalStorage) {
    const load = async () => {
      const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
      const filtered = list.filter((e) => e.kidId === opts.kidId);
      filtered.sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return b.createdAt - a.createdAt;
      });
      const resolved = await resolveLocalPhotoRefsForEntries(filtered);
      cb(resolved);
    };
    load();
    return subscribeToKey(`growthLog_${familyId}`, load);
  }

  const q = query(
    growthLogCol(familyId),
    where('kidId', '==', opts.kidId),
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const entries: GrowthLogEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() } as GrowthLogEntry);
    });
    cb(entries);
  });
}

export async function createEntry(
  familyId: string,
  input: {
    kidId: string;
    date: string;
    activityContent: string;
    createdByProfileId: string;
    title?: string;
    durationMinutes?: number;
    participantProfileIds?: string[];
    participantNames?: string[];
    moodTag?: MoodTag;
    energyTag?: EnergyTag;
    note?: string;
    photos?: PhotoRef[];
    linkedCompletionId?: string;
    linkedActivityId?: string;
  }
): Promise<string> {
  validateEntryInput(input);

  const entryId = `entry_${Math.random().toString(36).substr(2, 9)}`;
  const entry: GrowthLogEntry = {
    id: entryId,
    familyId,
    kidId: input.kidId,
    date: input.date,
    title: input.title || '',
    activityContent: input.activityContent,
    durationMinutes: input.durationMinutes,
    participantProfileIds: input.participantProfileIds || [],
    participantNames: input.participantNames || [],
    moodTag: input.moodTag,
    energyTag: input.energyTag,
    note: input.note || '',
    photos: input.photos || [],
    linkedCompletionId: input.linkedCompletionId,
    linkedActivityId: input.linkedActivityId,
    status: 'active',
    createdByProfileId: input.createdByProfileId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    list.push(entry);
    setStorageItem(`growthLog_${familyId}`, list);
    notifyKey(`growthLog_${familyId}`);
    return entryId;
  }

  const ref = growthEntryDoc(familyId, entryId);
  await setDoc(ref, entry);
  return entryId;
}

export async function updateEntry(
  familyId: string,
  id: string,
  patch: Partial<Omit<GrowthLogEntry, 'id' | 'familyId' | 'kidId' | 'createdByProfileId' | 'createdAt'>>
): Promise<void> {
  if (patch.activityContent !== undefined || patch.date !== undefined || patch.durationMinutes !== undefined) {
    validateEntryInput({
      activityContent: patch.activityContent ?? 'valid content placeholder',
      date: patch.date ?? '2026-01-01',
      durationMinutes: patch.durationMinutes,
    });
  }

  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    const updated = list.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...patch,
          updatedAt: Date.now(),
        };
      }
      return e;
    });
    setStorageItem(`growthLog_${familyId}`, updated);
    notifyKey(`growthLog_${familyId}`);
    return;
  }

  const ref = growthEntryDoc(familyId, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function trashEntry(familyId: string, id: string): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    const updated = list.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          status: 'trashed' as const,
          updatedAt: Date.now(),
        };
      }
      return e;
    });
    setStorageItem(`growthLog_${familyId}`, updated);
    notifyKey(`growthLog_${familyId}`);
    return;
  }

  const ref = growthEntryDoc(familyId, id);
  await updateDoc(ref, {
    status: 'trashed',
    updatedAt: Date.now(),
  });
}

export async function restoreEntry(familyId: string, id: string): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    const updated = list.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          status: 'active' as const,
          updatedAt: Date.now(),
        };
      }
      return e;
    });
    setStorageItem(`growthLog_${familyId}`, updated);
    notifyKey(`growthLog_${familyId}`);
    return;
  }

  const ref = growthEntryDoc(familyId, id);
  await updateDoc(ref, {
    status: 'active',
    updatedAt: Date.now(),
  });
}

export async function addPhotoToEntry(familyId: string, id: string, photo: PhotoRef): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    const updated = list.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          photos: [...(e.photos || []), photo],
          updatedAt: Date.now(),
        };
      }
      return e;
    });
    setStorageItem(`growthLog_${familyId}`, updated);
    notifyKey(`growthLog_${familyId}`);
    return;
  }

  const ref = growthEntryDoc(familyId, id);
  await updateDoc(ref, {
    photos: arrayUnion(photo),
    updatedAt: Date.now(),
  });
}

export async function removePhotoFromEntry(familyId: string, id: string, photoId: string): Promise<void> {
  if (useLocalStorage) {
    const list = getStorageItem<GrowthLogEntry[]>(`growthLog_${familyId}`, []);
    const entryIndex = list.findIndex((e) => e.id === id);
    if (entryIndex !== -1) {
      const entry = list[entryIndex];
      const photo = entry.photos.find((p) => p.id === photoId);
      if (photo) {
        await deleteEntryPhoto(photo);
        entry.photos = entry.photos.filter((p) => p.id !== photoId);
        entry.updatedAt = Date.now();
        setStorageItem(`growthLog_${familyId}`, list);
        notifyKey(`growthLog_${familyId}`);
      }
    }
    return;
  }

  const ref = growthEntryDoc(familyId, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const entry = snap.data() as GrowthLogEntry;
    const photo = entry.photos.find((p) => p.id === photoId);
    if (photo) {
      await deleteEntryPhoto(photo);
      await updateDoc(ref, {
        photos: arrayRemove(photo),
        updatedAt: Date.now(),
      });
    }
  }
}
