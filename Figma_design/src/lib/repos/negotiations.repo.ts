import { onSnapshot, setDoc, doc, updateDoc, getDoc, getDocs, runTransaction, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  negotiationsCol, 
  negotiationDoc, 
  offersCol, 
  offerDoc, 
  activityDoc, 
  rewardDoc,
  completionsCol,
  redemptionsCol,
  profilesCol
} from '../paths';
import { 
  NegotiationThread, 
  NegotiationOffer, 
  NegotiationStatus, 
  NegotiationTargetType, 
  Activity, 
  Reward, 
  Completion, 
  RedemptionRecord,
  Profile
} from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeNegotiations(
  familyId: string,
  opts: { status?: NegotiationStatus; targetType?: NegotiationTargetType },
  cb: (t: NegotiationThread[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
      const filtered = data.filter((t) => {
        const matchesStatus = !opts.status || t.status === opts.status;
        const matchesType = !opts.targetType || t.targetType === opts.targetType;
        return matchesStatus && matchesType;
      });
      // Sort open first, then by updatedAt descending
      filtered.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (b.status === 'open' && a.status !== 'open') return 1;
        return b.updatedAt - a.updatedAt;
      });
      cb(filtered);
    };
    load();
    return subscribeToKey(`negotiations_${familyId}`, load);
  }

  const colRef = negotiationsCol(familyId);
  return onSnapshot(colRef, (snapshot) => {
    const threads: NegotiationThread[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as NegotiationThread;
      const matchesStatus = !opts.status || data.status === opts.status;
      const matchesType = !opts.targetType || data.targetType === opts.targetType;
      if (matchesStatus && matchesType) {
        threads.push({ id: doc.id, ...data });
      }
    });
    threads.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (b.status === 'open' && a.status !== 'open') return 1;
      return b.updatedAt - a.updatedAt;
    });
    cb(threads);
  });
}

export function subscribeOffers(
  familyId: string,
  threadId: string,
  cb: (o: NegotiationOffer[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
      const filtered = data.filter((o) => o.threadId === threadId);
      filtered.sort((a, b) => a.createdAt - b.createdAt); // chronological
      cb(filtered);
    };
    load();
    return subscribeToKey(`offers_${familyId}`, load);
  }

  const colRef = offersCol(familyId, threadId);
  return onSnapshot(colRef, (snapshot) => {
    const offers: NegotiationOffer[] = [];
    snapshot.forEach((doc) => {
      offers.push({ id: doc.id, ...doc.data() as NegotiationOffer });
    });
    offers.sort((a, b) => a.createdAt - b.createdAt);
    cb(offers);
  });
}

export async function canInitiateNegotiation(
  familyId: string,
  targetType: NegotiationTargetType,
  targetId: string
): Promise<boolean> {
  if (useLocalStorage) {
    // 1. Target must exist and be active (status === 'active')
    if (targetType === 'activity') {
      const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const activity = activities.find((a) => a.id === targetId);
      if (!activity || activity.status !== 'active') return false;

      // 2. Must not have pending completions
      const completions = getStorageItem<Completion[]>(`completions_${familyId}`, []);
      const hasPending = completions.some(
        (c) => c.activityId === targetId && c.status === 'pending'
      );
      if (hasPending) return false;
    } else {
      const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const reward = rewards.find((r) => r.id === targetId);
      if (!reward || reward.status !== 'active') return false;

      // 2. Must not have pending redemptions
      const redemptions = getStorageItem<RedemptionRecord[]>(`redemptions_${familyId}`, []);
      const hasPending = redemptions.some(
        (r) => r.rewardId === targetId && r.status === 'requested'
      );
      if (hasPending) return false;
    }
    return true;
  }

  // Firestore path check
  if (targetType === 'activity') {
    const actSnap = await getDoc(activityDoc(familyId, targetId));
    if (!actSnap.exists() || actSnap.data().status !== 'active') return false;

    const compsCol = completionsCol(familyId);
    const q = query(
      compsCol,
      where('activityId', '==', targetId),
      where('status', '==', 'pending')
    );
    const compSnap = await getDocs(q);
    if (!compSnap.empty) return false;
  } else {
    const rewSnap = await getDoc(rewardDoc(familyId, targetId));
    if (!rewSnap.exists() || rewSnap.data().status !== 'active') return false;

    const redCol = redemptionsCol(familyId);
    const q = query(
      redCol,
      where('rewardId', '==', targetId),
      where('status', '==', 'requested')
    );
    const redSnap = await getDocs(q);
    if (!redSnap.empty) return false;
  }

  return true;
}

export async function initiateNegotiation(
  familyId: string,
  input: {
    targetType: NegotiationTargetType;
    targetId: string;
    kidId: string;
    proposedValue: number;
    message?: string;
  }
): Promise<string> {
  const now = Date.now();
  if (useLocalStorage) {
    const allowed = await canInitiateNegotiation(familyId, input.targetType, input.targetId);
    if (!allowed) {
      throw new Error('NEGOTIATION_BLOCKED');
    }

    let originalValue = 0;
    let targetTitle = '';

    if (input.targetType === 'activity') {
      const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const idx = activities.findIndex((a) => a.id === input.targetId);
      originalValue = activities[idx].tokenValue;
      targetTitle = activities[idx].title;
      activities[idx] = { ...activities[idx], status: 'negotiating', updatedAt: now };
      setStorageItem(`activities_${familyId}`, activities);
      notifyKey(`activities_${familyId}`);
    } else {
      const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const idx = rewards.findIndex((r) => r.id === input.targetId);
      originalValue = rewards[idx].tokenCost;
      targetTitle = rewards[idx].title;
      rewards[idx] = { ...rewards[idx], status: 'negotiating', updatedAt: now };
      setStorageItem(`rewards_${familyId}`, rewards);
      notifyKey(`rewards_${familyId}`);
    }

    const threads = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
    const threadId = `thread_${Math.random().toString(36).substring(2, 9)}`;
    const newThread: NegotiationThread = {
      id: threadId,
      familyId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetTitleSnapshot: targetTitle,
      initiatedByProfileId: input.kidId,
      status: 'open',
      originalValue,
      currentOfferValue: input.proposedValue,
      currentOfferByProfileId: input.kidId,
      createdAt: now,
      updatedAt: now,
    };
    threads.push(newThread);
    setStorageItem(`negotiations_${familyId}`, threads);
    notifyKey(`negotiations_${familyId}`);

    const offers = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
    const offerId = `offer_${Math.random().toString(36).substring(2, 9)}`;
    const newOffer: NegotiationOffer = {
      id: offerId,
      threadId,
      byProfileId: input.kidId,
      byRole: 'kid',
      value: input.proposedValue,
      message: input.message || '',
      kind: 'open',
      createdAt: now,
    };
    offers.push(newOffer);
    setStorageItem(`offers_${familyId}`, offers);
    notifyKey(`offers_${familyId}`);

    return threadId;
  }

  const threadColRef = negotiationsCol(familyId);
  const newThreadRef = doc(threadColRef);
  const threadId = newThreadRef.id;

  const offColRef = offersCol(familyId, threadId);
  const newOfferRef = doc(offColRef);

  await runTransaction(db, async (transaction) => {
    let originalValue = 0;
    let targetTitle = '';

    if (input.targetType === 'activity') {
      const actRef = activityDoc(familyId, input.targetId);
      const actSnap = await transaction.get(actRef);
      if (!actSnap.exists() || actSnap.data().status !== 'active') {
        throw new Error('NEGOTIATION_BLOCKED');
      }
      // Check pending comps in txn
      const compsColRef = completionsCol(familyId);
      const q = query(compsColRef, where('activityId', '==', input.targetId), where('status', '==', 'pending'));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) throw new Error('NEGOTIATION_BLOCKED');

      const act = actSnap.data() as Activity;
      originalValue = act.tokenValue;
      targetTitle = act.title;
      transaction.update(actRef, { status: 'negotiating', updatedAt: now });
    } else {
      const rewRef = rewardDoc(familyId, input.targetId);
      const rewSnap = await transaction.get(rewRef);
      if (!rewSnap.exists() || rewSnap.data().status !== 'active') {
        throw new Error('NEGOTIATION_BLOCKED');
      }
      // Check pending redemptions in txn
      const redColRef = redemptionsCol(familyId);
      const q = query(redColRef, where('rewardId', '==', input.targetId), where('status', '==', 'requested'));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) throw new Error('NEGOTIATION_BLOCKED');

      const rew = rewSnap.data() as Reward;
      originalValue = rew.tokenCost;
      targetTitle = rew.title;
      transaction.update(rewRef, { status: 'negotiating', updatedAt: now });
    }

    const newThread: NegotiationThread = {
      id: threadId,
      familyId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetTitleSnapshot: targetTitle,
      initiatedByProfileId: input.kidId,
      status: 'open',
      originalValue,
      currentOfferValue: input.proposedValue,
      currentOfferByProfileId: input.kidId,
      createdAt: now,
      updatedAt: now,
    };
    transaction.set(newThreadRef, newThread);

    const newOffer: NegotiationOffer = {
      id: newOfferRef.id,
      threadId,
      byProfileId: input.kidId,
      byRole: 'kid',
      value: input.proposedValue,
      message: input.message || '',
      kind: 'open',
      createdAt: now,
    };
    transaction.set(newOfferRef, newOffer);
  });

  return threadId;
}

export async function counterOffer(
  familyId: string,
  threadId: string,
  input: { byProfileId: string; value: number; message?: string }
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const threads = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx === -1) {
      throw new Error('THREAD_NOT_FOUND');
    }
    const thread = threads[idx];
    if (thread.status !== 'open') {
      throw new Error('THREAD_NOT_OPEN');
    }
    if (thread.currentOfferByProfileId === input.byProfileId) {
      throw new Error('CANNOT_COUNTER_YOUR_OWN_OFFER');
    }

    // Get sender role
    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const prof = profiles.find((p) => p.id === input.byProfileId);
    if (!prof) throw new Error('PROFILE_NOT_FOUND');

    threads[idx] = {
      ...thread,
      currentOfferValue: input.value,
      currentOfferByProfileId: input.byProfileId,
      updatedAt: now,
    };
    setStorageItem(`negotiations_${familyId}`, threads);
    notifyKey(`negotiations_${familyId}`);

    const offers = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
    const offerId = `offer_${Math.random().toString(36).substring(2, 9)}`;
    const newOffer: NegotiationOffer = {
      id: offerId,
      threadId,
      byProfileId: input.byProfileId,
      byRole: prof.role,
      value: input.value,
      message: input.message || '',
      kind: 'counter',
      createdAt: now,
    };
    offers.push(newOffer);
    setStorageItem(`offers_${familyId}`, offers);
    notifyKey(`offers_${familyId}`);
    return;
  }

  const thRef = negotiationDoc(familyId, threadId);
  const offColRef = offersCol(familyId, threadId);
  const newOfferRef = doc(offColRef);

  await runTransaction(db, async (transaction) => {
    const thSnap = await transaction.get(thRef);
    if (!thSnap.exists()) throw new Error('THREAD_NOT_FOUND');
    const thread = thSnap.data() as NegotiationThread;
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');
    if (thread.currentOfferByProfileId === input.byProfileId) {
      throw new Error('CANNOT_COUNTER_YOUR_OWN_OFFER');
    }

    const prRef = doc(profilesCol(familyId), input.byProfileId);
    const prSnap = await transaction.get(prRef);
    if (!prSnap.exists()) throw new Error('PROFILE_NOT_FOUND');
    const prof = prSnap.data() as Profile;

    transaction.update(thRef, {
      currentOfferValue: input.value,
      currentOfferByProfileId: input.byProfileId,
      updatedAt: now,
    });

    const newOffer: NegotiationOffer = {
      id: newOfferRef.id,
      threadId,
      byProfileId: input.byProfileId,
      byRole: prof.role,
      value: input.value,
      message: input.message || '',
      kind: 'counter',
      createdAt: now,
    };
    transaction.set(newOfferRef, newOffer);
  });
}

export async function acceptCurrentOffer(
  familyId: string,
  threadId: string,
  byProfileId: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const threads = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
    const thIdx = threads.findIndex((t) => t.id === threadId);
    if (thIdx === -1) throw new Error('THREAD_NOT_FOUND');
    const thread = threads[thIdx];
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');
    if (thread.currentOfferByProfileId === byProfileId) {
      throw new Error('CANNOT_ACCEPT_YOUR_OWN_OFFER');
    }

    const agreed = thread.currentOfferValue;

    // Apply to target
    if (thread.targetType === 'activity') {
      const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const actIdx = activities.findIndex((a) => a.id === thread.targetId);
      if (actIdx !== -1) {
        activities[actIdx] = {
          ...activities[actIdx],
          tokenValue: agreed,
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`activities_${familyId}`, activities);
        notifyKey(`activities_${familyId}`);
      }
    } else {
      const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const rewIdx = rewards.findIndex((r) => r.id === thread.targetId);
      if (rewIdx !== -1) {
        rewards[rewIdx] = {
          ...rewards[rewIdx],
          tokenCost: agreed,
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`rewards_${familyId}`, rewards);
        notifyKey(`rewards_${familyId}`);
      }
    }

    // Update profile role
    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const prof = profiles.find((p) => p.id === byProfileId);
    if (!prof) throw new Error('PROFILE_NOT_FOUND');

    // Update thread
    threads[thIdx] = {
      ...thread,
      status: 'agreed',
      agreedValue: agreed,
      closedAt: now,
      updatedAt: now,
    };
    setStorageItem(`negotiations_${familyId}`, threads);
    notifyKey(`negotiations_${familyId}`);

    // Add offer log
    const offers = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
    const offerId = `offer_${Math.random().toString(36).substring(2, 9)}`;
    const newOffer: NegotiationOffer = {
      id: offerId,
      threadId,
      byProfileId,
      byRole: prof.role,
      value: agreed,
      kind: 'accept',
      createdAt: now,
    };
    offers.push(newOffer);
    setStorageItem(`offers_${familyId}`, offers);
    notifyKey(`offers_${familyId}`);
    return;
  }

  const thRef = negotiationDoc(familyId, threadId);
  const offColRef = offersCol(familyId, threadId);
  const newOfferRef = doc(offColRef);

  await runTransaction(db, async (transaction) => {
    const thSnap = await transaction.get(thRef);
    if (!thSnap.exists()) throw new Error('THREAD_NOT_FOUND');
    const thread = thSnap.data() as NegotiationThread;
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');
    if (thread.currentOfferByProfileId === byProfileId) {
      throw new Error('CANNOT_ACCEPT_YOUR_OWN_OFFER');
    }

    const agreed = thread.currentOfferValue;

    const prRef = doc(profilesCol(familyId), byProfileId);
    const prSnap = await transaction.get(prRef);
    if (!prSnap.exists()) throw new Error('PROFILE_NOT_FOUND');
    const prof = prSnap.data() as Profile;

    // Apply to target
    if (thread.targetType === 'activity') {
      const actRef = activityDoc(familyId, thread.targetId);
      transaction.update(actRef, {
        tokenValue: agreed,
        status: 'active',
        updatedAt: now,
      });
    } else {
      const rewRef = rewardDoc(familyId, thread.targetId);
      transaction.update(rewRef, {
        tokenCost: agreed,
        status: 'active',
        updatedAt: now,
      });
    }

    transaction.update(thRef, {
      status: 'agreed',
      agreedValue: agreed,
      closedAt: now,
      updatedAt: now,
    });

    const newOffer: NegotiationOffer = {
      id: newOfferRef.id,
      threadId,
      byProfileId,
      byRole: prof.role,
      value: agreed,
      kind: 'accept',
      createdAt: now,
    };
    transaction.set(newOfferRef, newOffer);
  });
}

export async function rejectNegotiation(
  familyId: string,
  threadId: string,
  byProfileId: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const threads = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
    const thIdx = threads.findIndex((t) => t.id === threadId);
    if (thIdx === -1) throw new Error('THREAD_NOT_FOUND');
    const thread = threads[thIdx];
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');

    // Restore target status back to active (value remains unchanged)
    if (thread.targetType === 'activity') {
      const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const actIdx = activities.findIndex((a) => a.id === thread.targetId);
      if (actIdx !== -1) {
        activities[actIdx] = {
          ...activities[actIdx],
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`activities_${familyId}`, activities);
        notifyKey(`activities_${familyId}`);
      }
    } else {
      const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const rewIdx = rewards.findIndex((r) => r.id === thread.targetId);
      if (rewIdx !== -1) {
        rewards[rewIdx] = {
          ...rewards[rewIdx],
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`rewards_${familyId}`, rewards);
        notifyKey(`rewards_${familyId}`);
      }
    }

    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const prof = profiles.find((p) => p.id === byProfileId);
    if (!prof) throw new Error('PROFILE_NOT_FOUND');

    threads[thIdx] = {
      ...thread,
      status: 'rejected',
      closedAt: now,
      updatedAt: now,
    };
    setStorageItem(`negotiations_${familyId}`, threads);
    notifyKey(`negotiations_${familyId}`);

    const offers = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
    const offerId = `offer_${Math.random().toString(36).substring(2, 9)}`;
    const newOffer: NegotiationOffer = {
      id: offerId,
      threadId,
      byProfileId,
      byRole: prof.role,
      value: thread.currentOfferValue,
      kind: 'reject',
      createdAt: now,
    };
    offers.push(newOffer);
    setStorageItem(`offers_${familyId}`, offers);
    notifyKey(`offers_${familyId}`);
    return;
  }

  const thRef = negotiationDoc(familyId, threadId);
  const offColRef = offersCol(familyId, threadId);
  const newOfferRef = doc(offColRef);

  await runTransaction(db, async (transaction) => {
    const thSnap = await transaction.get(thRef);
    if (!thSnap.exists()) throw new Error('THREAD_NOT_FOUND');
    const thread = thSnap.data() as NegotiationThread;
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');

    const prRef = doc(profilesCol(familyId), byProfileId);
    const prSnap = await transaction.get(prRef);
    if (!prSnap.exists()) throw new Error('PROFILE_NOT_FOUND');
    const prof = prSnap.data() as Profile;

    if (thread.targetType === 'activity') {
      const actRef = activityDoc(familyId, thread.targetId);
      transaction.update(actRef, { status: 'active', updatedAt: now });
    } else {
      const rewRef = rewardDoc(familyId, thread.targetId);
      transaction.update(rewRef, { status: 'active', updatedAt: now });
    }

    transaction.update(thRef, {
      status: 'rejected',
      closedAt: now,
      updatedAt: now,
    });

    const newOffer: NegotiationOffer = {
      id: newOfferRef.id,
      threadId,
      byProfileId,
      byRole: prof.role,
      value: thread.currentOfferValue,
      kind: 'reject',
      createdAt: now,
    };
    transaction.set(newOfferRef, newOffer);
  });
}

export async function cancelNegotiation(
  familyId: string,
  threadId: string,
  kidId: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const threads = getStorageItem<NegotiationThread[]>(`negotiations_${familyId}`, []);
    const thIdx = threads.findIndex((t) => t.id === threadId);
    if (thIdx === -1) throw new Error('THREAD_NOT_FOUND');
    const thread = threads[thIdx];
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');
    if (thread.initiatedByProfileId !== kidId) {
      throw new Error('ONLY_INITIATOR_CAN_CANCEL');
    }

    if (thread.targetType === 'activity') {
      const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
      const actIdx = activities.findIndex((a) => a.id === thread.targetId);
      if (actIdx !== -1) {
        activities[actIdx] = {
          ...activities[actIdx],
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`activities_${familyId}`, activities);
        notifyKey(`activities_${familyId}`);
      }
    } else {
      const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
      const rewIdx = rewards.findIndex((r) => r.id === thread.targetId);
      if (rewIdx !== -1) {
        rewards[rewIdx] = {
          ...rewards[rewIdx],
          status: 'active',
          updatedAt: now,
        };
        setStorageItem(`rewards_${familyId}`, rewards);
        notifyKey(`rewards_${familyId}`);
      }
    }

    threads[thIdx] = {
      ...thread,
      status: 'cancelled',
      closedAt: now,
      updatedAt: now,
    };
    setStorageItem(`negotiations_${familyId}`, threads);
    notifyKey(`negotiations_${familyId}`);

    const offers = getStorageItem<NegotiationOffer[]>(`offers_${familyId}`, []);
    const offerId = `offer_${Math.random().toString(36).substring(2, 9)}`;
    const newOffer: NegotiationOffer = {
      id: offerId,
      threadId,
      byProfileId: kidId,
      byRole: 'kid',
      value: thread.currentOfferValue,
      kind: 'cancel',
      createdAt: now,
    };
    offers.push(newOffer);
    setStorageItem(`offers_${familyId}`, offers);
    notifyKey(`offers_${familyId}`);
    return;
  }

  const thRef = negotiationDoc(familyId, threadId);
  const offColRef = offersCol(familyId, threadId);
  const newOfferRef = doc(offColRef);

  await runTransaction(db, async (transaction) => {
    const thSnap = await transaction.get(thRef);
    if (!thSnap.exists()) throw new Error('THREAD_NOT_FOUND');
    const thread = thSnap.data() as NegotiationThread;
    if (thread.status !== 'open') throw new Error('THREAD_NOT_OPEN');
    if (thread.initiatedByProfileId !== kidId) {
      throw new Error('ONLY_INITIATOR_CAN_CANCEL');
    }

    if (thread.targetType === 'activity') {
      const actRef = activityDoc(familyId, thread.targetId);
      transaction.update(actRef, { status: 'active', updatedAt: now });
    } else {
      const rewRef = rewardDoc(familyId, thread.targetId);
      transaction.update(rewRef, { status: 'active', updatedAt: now });
    }

    transaction.update(thRef, {
      status: 'cancelled',
      closedAt: now,
      updatedAt: now,
    });

    const newOffer: NegotiationOffer = {
      id: newOfferRef.id,
      threadId,
      byProfileId: kidId,
      byRole: 'kid',
      value: thread.currentOfferValue,
      kind: 'cancel',
      createdAt: now,
    };
    transaction.set(newOfferRef, newOffer);
  });
}
