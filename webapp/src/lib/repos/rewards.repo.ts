import { onSnapshot, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { rewardsCol, rewardDoc } from '../paths';
import { Reward, RewardStatus } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeRewards(
  familyId: string,
  cb: (r: Reward[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const filtered = data.filter((r) => r.status !== 'archived');
      // Sort: 'proposed' first, then 'active', then by createdAt descending
      filtered.sort((a, b) => {
        if (a.status === b.status) {
          return b.createdAt - a.createdAt;
        }
        if (a.status === 'proposed') return -1;
        if (b.status === 'proposed') return 1;
        return 0;
      });
      cb(filtered);
    };
    load();
    return subscribeToKey(`rewards_${familyId}`, load);
  }

  const colRef = rewardsCol(familyId);
  return onSnapshot(colRef, (snapshot) => {
    const rewards: Reward[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Reward;
      if (data.status !== 'archived') {
        rewards.push({ id: doc.id, ...data });
      }
    });
    rewards.sort((a, b) => {
      if (a.status === b.status) {
        return b.createdAt - a.createdAt;
      }
      if (a.status === 'proposed') return -1;
      if (b.status === 'proposed') return 1;
      return 0;
    });
    cb(rewards);
  });
}

export async function proposeReward(
  familyId: string,
  input: {
    title: string;
    description?: string;
    proposedByProfileId: string;
    forKidIds: string[];
  }
): Promise<string> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const newId = `reward_${Math.random().toString(36).substring(2, 9)}`;
    const newReward: Reward = {
      id: newId,
      familyId,
      title: input.title,
      description: input.description || '',
      tokenCost: 0,
      forKidIds: input.forKidIds,
      status: 'proposed',
      proposedByProfileId: input.proposedByProfileId,
      createdAt: now,
      updatedAt: now,
    };
    rewards.push(newReward);
    setStorageItem(`rewards_${familyId}`, rewards);
    notifyKey(`rewards_${familyId}`);
    return newId;
  }

  const colRef = rewardsCol(familyId);
  const newDocRef = doc(colRef);
  const newId = newDocRef.id;
  const newReward: Reward = {
    id: newId,
    familyId,
    title: input.title,
    description: input.description || '',
    tokenCost: 0,
    forKidIds: input.forKidIds,
    status: 'proposed',
    proposedByProfileId: input.proposedByProfileId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, newReward);
  return newId;
}

export async function createReward(
  familyId: string,
  input: {
    title: string;
    description?: string;
    tokenCost: number;
    forKidIds: string[];
    createdByProfileId: string;
  }
): Promise<string> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const newId = `reward_${Math.random().toString(36).substring(2, 9)}`;
    const newReward: Reward = {
      id: newId,
      familyId,
      title: input.title,
      description: input.description || '',
      tokenCost: input.tokenCost,
      forKidIds: input.forKidIds,
      status: 'active',
      proposedByProfileId: input.createdByProfileId,
      createdAt: now,
      updatedAt: now,
    };
    rewards.push(newReward);
    setStorageItem(`rewards_${familyId}`, rewards);
    notifyKey(`rewards_${familyId}`);
    return newId;
  }

  const colRef = rewardsCol(familyId);
  const newDocRef = doc(colRef);
  const newId = newDocRef.id;
  const newReward: Reward = {
    id: newId,
    familyId,
    title: input.title,
    description: input.description || '',
    tokenCost: input.tokenCost,
    forKidIds: input.forKidIds,
    status: 'active',
    proposedByProfileId: input.createdByProfileId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newDocRef, newReward);
  return newId;
}

export async function setRewardCostAndActivate(
  familyId: string,
  id: string,
  tokenCost: number
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const idx = rewards.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rewards[idx] = {
        ...rewards[idx],
        tokenCost,
        status: 'active',
        updatedAt: now,
      };
      setStorageItem(`rewards_${familyId}`, rewards);
      notifyKey(`rewards_${familyId}`);
    }
    return;
  }

  const ref = rewardDoc(familyId, id);
  await updateDoc(ref, {
    tokenCost,
    status: 'active',
    updatedAt: now,
  });
}

export async function rejectProposal(
  familyId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const idx = rewards.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rewards[idx] = {
        ...rewards[idx],
        status: 'archived',
        updatedAt: now,
      };
      setStorageItem(`rewards_${familyId}`, rewards);
      notifyKey(`rewards_${familyId}`);
    }
    return;
  }

  const ref = rewardDoc(familyId, id);
  await updateDoc(ref, {
    status: 'archived',
    updatedAt: now,
  });
}

export async function updateReward(
  familyId: string,
  id: string,
  patch: Partial<Pick<Reward, 'title' | 'description' | 'tokenCost' | 'forKidIds'>>
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const idx = rewards.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rewards[idx] = {
        ...rewards[idx],
        ...patch,
        updatedAt: now,
      };
      setStorageItem(`rewards_${familyId}`, rewards);
      notifyKey(`rewards_${familyId}`);
    }
    return;
  }

  const ref = rewardDoc(familyId, id);
  await updateDoc(ref, {
    ...patch,
    updatedAt: now,
  });
}

export async function archiveReward(
  familyId: string,
  id: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const idx = rewards.findIndex((r) => r.id === id);
    if (idx !== -1) {
      rewards[idx] = {
        ...rewards[idx],
        status: 'archived',
        updatedAt: now,
      };
      setStorageItem(`rewards_${familyId}`, rewards);
      notifyKey(`rewards_${familyId}`);
    }
    return;
  }

  const ref = rewardDoc(familyId, id);
  await updateDoc(ref, {
    status: 'archived',
    updatedAt: now,
  });
}
