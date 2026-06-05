import { onSnapshot, setDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { redemptionsCol, redemptionDoc, rewardDoc, profileDoc, ledgerCol } from '../paths';
import { RedemptionRecord, RedemptionStatus, Reward, Profile, LedgerEntry } from '../types';
import { getStorageItem, setStorageItem, subscribeToKey, notifyKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeRedemptions(
  familyId: string,
  opts: { status?: RedemptionStatus; kidId?: string },
  cb: (r: RedemptionRecord[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<RedemptionRecord[]>(`redemptions_${familyId}`, []);
      const filtered = data.filter((r) => {
        const matchesStatus = !opts.status || r.status === opts.status;
        const matchesKid = !opts.kidId || r.kidId === opts.kidId;
        return matchesStatus && matchesKid;
      });
      // Sort by requestedAt descending
      filtered.sort((a, b) => b.requestedAt - a.requestedAt);
      cb(filtered);
    };
    load();
    return subscribeToKey(`redemptions_${familyId}`, load);
  }

  const colRef = redemptionsCol(familyId);
  return onSnapshot(colRef, (snapshot) => {
    const redemptions: RedemptionRecord[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as RedemptionRecord;
      const matchesStatus = !opts.status || data.status === opts.status;
      const matchesKid = !opts.kidId || data.kidId === opts.kidId;
      if (matchesStatus && matchesKid) {
        redemptions.push({ id: doc.id, ...data });
      }
    });
    redemptions.sort((a, b) => b.requestedAt - a.requestedAt);
    cb(redemptions);
  });
}

export async function redeemReward(
  familyId: string,
  input: { rewardId: string; kidId: string; note?: string }
): Promise<string> {
  const now = Date.now();
  if (useLocalStorage) {
    // 1. Read reward
    const rewards = getStorageItem<Reward[]>(`rewards_${familyId}`, []);
    const reward = rewards.find((r) => r.id === input.rewardId);
    if (!reward) {
      throw new Error('REWARD_NOT_FOUND');
    }
    if (reward.status !== 'active') {
      throw new Error('REWARD_NOT_ACTIVE');
    }
    if (reward.forKidIds.length > 0 && !reward.forKidIds.includes(input.kidId)) {
      throw new Error('REWARD_NOT_AVAILABLE_FOR_KID');
    }

    // 2. Read kid profile
    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const kidIdx = profiles.findIndex((p) => p.id === input.kidId);
    if (kidIdx === -1) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kid = profiles[kidIdx];
    if ((kid.tokenBalance || 0) < reward.tokenCost) {
      throw new Error('INSUFFICIENT_TOKENS');
    }

    // 3. Update kid balance
    const newBalance = kid.tokenBalance - reward.tokenCost;
    profiles[kidIdx] = {
      ...kid,
      tokenBalance: newBalance,
    };

    // 4. Create redemption record
    const redemptions = getStorageItem<RedemptionRecord[]>(`redemptions_${familyId}`, []);
    const redemptionId = `redemption_${Math.random().toString(36).substring(2, 9)}`;
    const newRedemption: RedemptionRecord = {
      id: redemptionId,
      familyId,
      rewardId: input.rewardId,
      rewardTitleSnapshot: reward.title,
      tokenCostSnapshot: reward.tokenCost,
      kidId: input.kidId,
      status: 'requested',
      note: input.note || '',
      requestedAt: now,
    };
    redemptions.push(newRedemption);

    // 5. Create ledger entry
    const ledger = getStorageItem<LedgerEntry[]>(`ledger_${familyId}`, []);
    const ledgerId = `ledger_${Math.random().toString(36).substring(2, 9)}`;
    const ledgerEntry: LedgerEntry = {
      id: ledgerId,
      familyId,
      kidId: input.kidId,
      delta: -reward.tokenCost,
      reason: 'reward_redeemed',
      relatedRedemptionId: redemptionId,
      balanceAfter: newBalance,
      createdAt: now,
    };
    ledger.push(ledgerEntry);

    // Save
    setStorageItem(`profiles_${familyId}`, profiles);
    setStorageItem(`redemptions_${familyId}`, redemptions);
    setStorageItem(`ledger_${familyId}`, ledger);

    notifyKey(`profiles_${familyId}`);
    notifyKey(`redemptions_${familyId}`);
    notifyKey(`ledger_${familyId}`);

    return redemptionId;
  }

  const redColRef = redemptionsCol(familyId);
  const newRedDocRef = doc(redColRef);
  const redemptionId = newRedDocRef.id;

  await runTransaction(db, async (transaction) => {
    const rewRef = rewardDoc(familyId, input.rewardId);
    const rewSnap = await transaction.get(rewRef);
    if (!rewSnap.exists()) {
      throw new Error('REWARD_NOT_FOUND');
    }
    const reward = rewSnap.data() as Reward;
    if (reward.status !== 'active') {
      throw new Error('REWARD_NOT_ACTIVE');
    }
    if (reward.forKidIds && reward.forKidIds.length > 0 && !reward.forKidIds.includes(input.kidId)) {
      throw new Error('REWARD_NOT_AVAILABLE_FOR_KID');
    }

    const kidRef = profileDoc(familyId, input.kidId);
    const kidSnap = await transaction.get(kidRef);
    if (!kidSnap.exists()) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kidData = kidSnap.data() as Profile;
    if ((kidData.tokenBalance || 0) < reward.tokenCost) {
      throw new Error('INSUFFICIENT_TOKENS');
    }

    const newBalance = (kidData.tokenBalance || 0) - reward.tokenCost;

    transaction.update(kidRef, {
      tokenBalance: newBalance,
    });

    const newRedemption: RedemptionRecord = {
      id: redemptionId,
      familyId,
      rewardId: input.rewardId,
      rewardTitleSnapshot: reward.title,
      tokenCostSnapshot: reward.tokenCost,
      kidId: input.kidId,
      status: 'requested',
      note: input.note || '',
      requestedAt: now,
    };
    transaction.set(newRedDocRef, newRedemption);

    const ledColRef = ledgerCol(familyId);
    const newLedDocRef = doc(ledColRef);
    const ledgerEntry: LedgerEntry = {
      id: newLedDocRef.id,
      familyId,
      kidId: input.kidId,
      delta: -reward.tokenCost,
      reason: 'reward_redeemed',
      relatedRedemptionId: redemptionId,
      balanceAfter: newBalance,
      createdAt: now,
    };
    transaction.set(newLedDocRef, ledgerEntry);
  });

  return redemptionId;
}

export async function fulfillRedemption(
  familyId: string,
  id: string,
  reviewerId: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    const redemptions = getStorageItem<RedemptionRecord[]>(`redemptions_${familyId}`, []);
    const idx = redemptions.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error('REDEMPTION_NOT_FOUND');
    }
    if (redemptions[idx].status !== 'requested') {
      return;
    }
    redemptions[idx] = {
      ...redemptions[idx],
      status: 'fulfilled',
      resolvedAt: now,
      resolvedByProfileId: reviewerId,
    };
    setStorageItem(`redemptions_${familyId}`, redemptions);
    notifyKey(`redemptions_${familyId}`);
    return;
  }

  const ref = redemptionDoc(familyId, id);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('REDEMPTION_NOT_FOUND');
    }
    const redemption = snap.data() as RedemptionRecord;
    if (redemption.status !== 'requested') {
      return;
    }
    transaction.update(ref, {
      status: 'fulfilled',
      resolvedAt: now,
      resolvedByProfileId: reviewerId,
    });
  });
}

export async function refundRedemption(
  familyId: string,
  id: string,
  reviewerId: string
): Promise<void> {
  const now = Date.now();
  if (useLocalStorage) {
    // 1. Read redemptions
    const redemptions = getStorageItem<RedemptionRecord[]>(`redemptions_${familyId}`, []);
    const redIdx = redemptions.findIndex((r) => r.id === id);
    if (redIdx === -1) {
      throw new Error('REDEMPTION_NOT_FOUND');
    }
    const redemption = redemptions[redIdx];
    if (redemption.status !== 'requested') {
      return;
    }

    // 2. Read kid profile
    const profiles = getStorageItem<Profile[]>(`profiles_${familyId}`, []);
    const kidIdx = profiles.findIndex((p) => p.id === redemption.kidId);
    if (kidIdx === -1) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kid = profiles[kidIdx];

    // 3. Update balance
    const newBalance = (kid.tokenBalance || 0) + redemption.tokenCostSnapshot;
    profiles[kidIdx] = {
      ...kid,
      tokenBalance: newBalance,
    };

    // 4. Update status
    redemptions[redIdx] = {
      ...redemption,
      status: 'refunded',
      resolvedAt: now,
      resolvedByProfileId: reviewerId,
    };

    // 5. Create ledger entry
    const ledger = getStorageItem<LedgerEntry[]>(`ledger_${familyId}`, []);
    const ledgerId = `ledger_${Math.random().toString(36).substring(2, 9)}`;
    const ledgerEntry: LedgerEntry = {
      id: ledgerId,
      familyId,
      kidId: redemption.kidId,
      delta: redemption.tokenCostSnapshot,
      reason: 'reward_refunded',
      relatedRedemptionId: id,
      balanceAfter: newBalance,
      createdAt: now,
    };
    ledger.push(ledgerEntry);

    // Save
    setStorageItem(`profiles_${familyId}`, profiles);
    setStorageItem(`redemptions_${familyId}`, redemptions);
    setStorageItem(`ledger_${familyId}`, ledger);

    notifyKey(`profiles_${familyId}`);
    notifyKey(`redemptions_${familyId}`);
    notifyKey(`ledger_${familyId}`);
    return;
  }

  const redRef = redemptionDoc(familyId, id);

  await runTransaction(db, async (transaction) => {
    const redSnap = await transaction.get(redRef);
    if (!redSnap.exists()) {
      throw new Error('REDEMPTION_NOT_FOUND');
    }
    const redemption = redSnap.data() as RedemptionRecord;
    if (redemption.status !== 'requested') {
      return;
    }

    const kidRef = profileDoc(familyId, redemption.kidId);
    const kidSnap = await transaction.get(kidRef);
    if (!kidSnap.exists()) {
      throw new Error('KID_PROFILE_NOT_FOUND');
    }
    const kidData = kidSnap.data() as Profile;

    const newBalance = (kidData.tokenBalance || 0) + redemption.tokenCostSnapshot;

    transaction.update(kidRef, {
      tokenBalance: newBalance,
    });

    transaction.update(redRef, {
      status: 'refunded',
      resolvedAt: now,
      resolvedByProfileId: reviewerId,
    });

    const ledColRef = ledgerCol(familyId);
    const newLedDocRef = doc(ledColRef);
    const ledgerEntry: LedgerEntry = {
      id: newLedDocRef.id,
      familyId,
      kidId: redemption.kidId,
      delta: redemption.tokenCostSnapshot,
      reason: 'reward_refunded',
      relatedRedemptionId: id,
      balanceAfter: newBalance,
      createdAt: now,
    };
    transaction.set(newLedDocRef, ledgerEntry);
  });
}
