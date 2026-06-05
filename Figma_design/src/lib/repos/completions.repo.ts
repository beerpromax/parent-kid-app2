import { 
  onSnapshot, 
  query, 
  where, 
  getDoc, 
  getDocs,
  setDoc, 
  doc, 
  runTransaction, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  completionsCol, 
  completionDoc, 
  activityDoc, 
  profileDoc, 
  ledgerCol 
} from '../paths';
import { Completion, CompletionStatus, Profile, Activity, LedgerEntry } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeCompletions(
  familyId: string,
  opts: { status?: CompletionStatus; kidId?: string },
  cb: (c: Completion[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<Completion[]>(`completions_${familyId}`, []);
      const filtered = data.filter((c) => {
        const matchesStatus = !opts.status || c.status === opts.status;
        const matchesKid = !opts.kidId || c.kidId === opts.kidId;
        return matchesStatus && matchesKid;
      });
      // Sort by submittedAt descending
      filtered.sort((a, b) => b.submittedAt - a.submittedAt);
      cb(filtered);
    };
    load();
    return subscribeToKey(`completions_${familyId}`, load);
  }

  const colRef = completionsCol(familyId);
  return onSnapshot(colRef, (snapshot) => {
    const completions: Completion[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Completion;
      const matchesStatus = !opts.status || data.status === opts.status;
      const matchesKid = !opts.kidId || data.kidId === opts.kidId;
      if (matchesStatus && matchesKid) {
        completions.push({ id: doc.id, ...data });
      }
    });
    completions.sort((a, b) => b.submittedAt - a.submittedAt);
    cb(completions);
  });
}

export async function hasPendingCompletion(
  familyId: string, 
  activityId: string, 
  kidId: string
): Promise<boolean> {
  if (useLocalStorage) {
    const data = getStorageItem<Completion[]>(`completions_${familyId}`, []);
    return data.some(
      (c) => c.activityId === activityId && c.kidId === kidId && c.status === 'pending'
    );
  }

  const colRef = completionsCol(familyId);
  const q = query(
    colRef,
    where('activityId', '==', activityId),
    where('kidId', '==', kidId),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function submitCompletion(
  familyId: string,
  input: {
    activityId: string;
    kidId: string;
    note?: string;
  }
): Promise<string> {
  if (useLocalStorage) {
    // 1. Check pending
    const exists = await hasPendingCompletion(familyId, input.activityId, input.kidId);
    if (exists) {
      throw new Error('PENDING_COMPLETION_EXISTS');
    }

    // 2. Read activity
    const activities = getStorageItem<Activity[]>(`activities_${familyId}`, []);
    const activity = activities.find((a) => a.id === input.activityId);
    if (!activity) {
      throw new Error('ACTIVITY_NOT_FOUND');
    }

    // 3. Create completion
    const completions = getStorageItem<Completion[]>(`completions_${familyId}`, []);
    const newId = `completion_${Math.random().toString(36).substr(2, 9)}`;
    const newCompletion: Completion = {
      id: newId,
      familyId,
      activityId: input.activityId,
      activityTitleSnapshot: activity.title,
      tokenValueSnapshot: activity.tokenValue,
      kidId: input.kidId,
      status: 'pending',
      note: input.note || '',
      submittedAt: Date.now(),
    };

    completions.push(newCompletion);
    setStorageItem(`completions_${familyId}`, completions);
    notifyKey(`completions_${familyId}`);
    return newId;
  }

  const exists = await hasPendingCompletion(familyId, input.activityId, input.kidId);
  if (exists) {
    throw new Error('PENDING_COMPLETION_EXISTS');
  }

  const actRef = activityDoc(familyId, input.activityId);
  const actSnap = await getDoc(actRef);
  if (!actSnap.exists()) {
    throw new Error('ACTIVITY_NOT_FOUND');
  }
  const activityData = actSnap.data();

  const colRef = completionsCol(familyId);
  const newDocRef = doc(colRef);
  const completionId = newDocRef.id;

  const completion: Completion = {
    id: completionId,
    familyId,
    activityId: input.activityId,
    activityTitleSnapshot: activityData.title,
    tokenValueSnapshot: activityData.tokenValue,
    kidId: input.kidId,
    status: 'pending',
    note: input.note || '',
    submittedAt: Date.now(),
  };

  await setDoc(newDocRef, completion);
  return completionId;
}

export async function approveCompletion(
  familyId: string,
  completionId: string,
  reviewerId: string
): Promise<void> {
  const milestones: Record<number, number> = { 3: 3, 7: 7, 14: 15, 30: 30 };

  if (useLocalStorage) {
    // 1. Read completions
    const completions = getStorageItem<Completion[]>(`completions_${familyId}`, []);
    const compIdx = completions.findIndex((c) => c.id === completionId);
    if (compIdx === -1) {
      throw new Error('COMPLETION_NOT_FOUND');
    }
    const completion = completions[compIdx];

    // 2. Abort if not pending
    if (completion.status !== 'pending') {
      return;
    }

    // 3. Read profiles
    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const kidIdx = profiles.findIndex((p) => p.id === completion.kidId);
    if (kidIdx === -1) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kid = profiles[kidIdx];

    // 4. Calculate new balance & streak
    const tokenChange = completion.tokenValueSnapshot;
    const now = Date.now();

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const yesterdayDate = new Date(now - 86400000);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');

    let currentStreak = kid.currentStreak || 0;
    let longestStreak = kid.longestStreak || 0;
    let lastStreakDate = kid.lastStreakDate || '';

    let streakUpdated = false;
    if (lastStreakDate === todayStr) {
      // Already completed today, no change
    } else if (lastStreakDate === yesterdayStr) {
      currentStreak += 1;
      streakUpdated = true;
    } else {
      currentStreak = 1;
      streakUpdated = true;
    }

    if (streakUpdated) {
      lastStreakDate = todayStr;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    let balanceWithActivity = (kid.tokenBalance || 0) + tokenChange;
    let finalBalance = balanceWithActivity;
    let bonusGiven = 0;

    if (streakUpdated && milestones[currentStreak]) {
      bonusGiven = milestones[currentStreak];
      finalBalance += bonusGiven;
    }

    // 5. Update completion
    completions[compIdx] = {
      ...completion,
      status: 'approved',
      reviewedAt: now,
      reviewedByProfileId: reviewerId,
      settledTokens: tokenChange,
    };

    // 6. Update kid profile
    profiles[kidIdx] = {
      ...kid,
      tokenBalance: finalBalance,
      currentStreak,
      longestStreak,
      lastStreakDate,
    };

    // 7. Create ledger entries
    const ledger = getStorageItem<LedgerEntry[]>(`ledger_${familyId}`, []);
    const newLedgerId = `ledger_${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: LedgerEntry = {
      id: newLedgerId,
      familyId,
      kidId: completion.kidId,
      delta: tokenChange,
      reason: 'activity_approved',
      relatedCompletionId: completionId,
      balanceAfter: balanceWithActivity,
      createdAt: now,
    };
    ledger.push(newEntry);

    if (bonusGiven > 0) {
      const bonusLedgerId = `ledger_${Math.random().toString(36).substr(2, 9)}`;
      const bonusEntry: LedgerEntry = {
        id: bonusLedgerId,
        familyId,
        kidId: completion.kidId,
        delta: bonusGiven,
        reason: 'streak_bonus',
        balanceAfter: finalBalance,
        createdAt: now + 1, // slightly later to sort cleanly
      };
      ledger.push(bonusEntry);
    }

    // Save everything
    setStorageItem(`completions_${familyId}`, completions);
    setStorageItem(`profiles_${familyId}`, profiles);
    setStorageItem(`ledger_${familyId}`, ledger);

    // Trigger reactive listeners
    notifyKey(`completions_${familyId}`);
    notifyKey(`profiles_${familyId}`);
    notifyKey(`ledger_${familyId}`);
    return;
  }

  const compRef = completionDoc(familyId, completionId);

  await runTransaction(db, async (transaction) => {
    const compSnap = await transaction.get(compRef);
    if (!compSnap.exists()) {
      throw new Error('COMPLETION_NOT_FOUND');
    }
    const completion = compSnap.data() as Completion;

    if (completion.status !== 'pending') {
      return;
    }

    const kidRef = profileDoc(familyId, completion.kidId);
    const kidSnap = await transaction.get(kidRef);
    if (!kidSnap.exists()) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kidData = kidSnap.data() as Profile;

    const tokenChange = completion.tokenValueSnapshot;
    const now = Date.now();

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const yesterdayDate = new Date(now - 86400000);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');

    let currentStreak = kidData.currentStreak || 0;
    let longestStreak = kidData.longestStreak || 0;
    let lastStreakDate = kidData.lastStreakDate || '';

    let streakUpdated = false;
    if (lastStreakDate === todayStr) {
      // Already completed today
    } else if (lastStreakDate === yesterdayStr) {
      currentStreak += 1;
      streakUpdated = true;
    } else {
      currentStreak = 1;
      streakUpdated = true;
    }

    if (streakUpdated) {
      lastStreakDate = todayStr;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    let balanceWithActivity = (kidData.tokenBalance || 0) + tokenChange;
    let finalBalance = balanceWithActivity;
    let bonusGiven = 0;

    if (streakUpdated && milestones[currentStreak]) {
      bonusGiven = milestones[currentStreak];
      finalBalance += bonusGiven;
    }

    transaction.update(compRef, {
      status: 'approved',
      reviewedAt: now,
      reviewedByProfileId: reviewerId,
      settledTokens: tokenChange,
    });

    transaction.update(kidRef, {
      tokenBalance: finalBalance,
      currentStreak,
      longestStreak,
      lastStreakDate,
    });

    const ledColRef = ledgerCol(familyId);
    const newLedgerRef = doc(ledColRef);
    transaction.set(newLedgerRef, {
      id: newLedgerRef.id,
      familyId,
      kidId: completion.kidId,
      delta: tokenChange,
      reason: 'activity_approved',
      relatedCompletionId: completionId,
      balanceAfter: balanceWithActivity,
      createdAt: now,
    });

    if (bonusGiven > 0) {
      const newBonusLedgerRef = doc(ledColRef);
      transaction.set(newBonusLedgerRef, {
        id: newBonusLedgerRef.id,
        familyId,
        kidId: completion.kidId,
        delta: bonusGiven,
        reason: 'streak_bonus',
        balanceAfter: finalBalance,
        createdAt: now + 1,
      });
    }
  });
}

export async function rejectCompletion(
  familyId: string,
  completionId: string,
  reviewerId: string
): Promise<void> {
  if (useLocalStorage) {
    const completions = getStorageItem<Completion[]>(`completions_${familyId}`, []);
    const updated = completions.map((c) => {
      if (c.id === completionId) {
        return {
          ...c,
          status: 'rejected' as const,
          reviewedAt: Date.now(),
          reviewedByProfileId: reviewerId,
        };
      }
      return c;
    });
    setStorageItem(`completions_${familyId}`, updated);
    notifyKey(`completions_${familyId}`);
    return;
  }

  const ref = completionDoc(familyId, completionId);
  await updateDoc(ref, {
    status: 'rejected',
    reviewedAt: Date.now(),
    reviewedByProfileId: reviewerId,
  });
}
