import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { familyDoc, profilesCol, profileDoc, userDoc, inviteDoc, activityDoc, rewardDoc } from '../paths';
import { Profile, UserMapping, Activity, Reward } from '../types';
import { getInvite, normalizeInviteCode } from '../repos/invites.repo';

// Kids sign in with a username; Firebase email/password needs an email-shaped
// string, so we synthesize one. It is never verified or mailed.
const KID_EMAIL_DOMAIN = 'kids.parent-kid-app2.firebaseapp.com';

export function sanitizeUsername(username: string): string {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    throw new Error('INVALID_USERNAME');
  }
  return u;
}

export function kidEmail(username: string): string {
  return `${sanitizeUsername(username)}@${KID_EMAIL_DOMAIN}`;
}

async function deleteAuthUserQuietly(user: User) {
  try {
    await user.delete();
  } catch {
    // Account stays orphaned in Auth (no Firestore mapping). Harmless: it can
    // never pass the rules without an invite, and the user just re-tries.
  }
}

function starterActivities(familyId: string, parentProfileId: string): Activity[] {
  const now = Date.now();
  const base = { familyId, assignedKidIds: [], status: 'active' as const, createdByProfileId: parentProfileId, createdAt: now, updatedAt: now };
  return [
    { id: 'act_clean_room', title: 'Clean your room', description: 'Make bed, organize toys, vacuum floor', durationMinutes: 20, tokenValue: 10, ...base },
    { id: 'act_homework', title: 'Homework time', description: 'Complete all homework assignments', durationMinutes: 45, tokenValue: 15, ...base },
    { id: 'act_dishes', title: 'Help with dishes', description: 'Clear table and load dishwasher', durationMinutes: 15, tokenValue: 5, ...base },
    { id: 'act_read', title: 'Read for 30 minutes', description: 'Read a book of your choice', durationMinutes: 30, tokenValue: 8, ...base },
  ];
}

function starterRewards(familyId: string, parentProfileId: string): Reward[] {
  const now = Date.now();
  const base = { familyId, forKidIds: [], status: 'active' as const, proposedByProfileId: parentProfileId, createdAt: now, updatedAt: now };
  return [
    { id: 'rew_ice_cream', title: 'Ice Cream Treat', description: 'A delicious double-scoop ice cream with toppings!', tokenCost: 15, ...base },
    { id: 'rew_screen_time', title: 'Extra 30 Min Screen Time', description: '30 additional minutes of gaming or video time.', tokenCost: 25, ...base },
  ];
}

export async function signUpParent(input: {
  email: string;
  password: string;
  parentName: string;
  familyName: string;
}): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = cred.user.uid;

  try {
    const familyRef = doc(collection(db, 'families'));
    const familyId = familyRef.id;
    const profileRef = doc(profilesCol(familyId));
    const profileId = profileRef.id;

    const parentProfile: Profile = {
      id: profileId,
      familyId,
      name: input.parentName.trim(),
      role: 'parent',
      color: '#ff8b3d',
      emoji: '👑',
      tokenBalance: 0,
      uid,
    };
    const mapping: UserMapping = {
      uid,
      familyId,
      profileId,
      role: 'parent',
      email: input.email.trim(),
      createdAt: Date.now(),
    };

    // Batch #1: the three docs the rules validate together via getAfter (D8).
    const signupBatch = writeBatch(db);
    signupBatch.set(familyRef, { name: input.familyName.trim(), ownerUid: uid, createdAt: Date.now() });
    signupBatch.set(profileRef, { ...parentProfile, createdAt: Date.now() });
    signupBatch.set(userDoc(uid), mapping);
    await signupBatch.commit();

    // Batch #2: starter content — separate commit so subcollection rules can
    // resolve membership with a plain get() on the now-existing users doc.
    const seedBatch = writeBatch(db);
    for (const a of starterActivities(familyId, profileId)) {
      seedBatch.set(activityDoc(familyId, a.id), a);
    }
    for (const r of starterRewards(familyId, profileId)) {
      seedBatch.set(rewardDoc(familyId, r.id), r);
    }
    await seedBatch.commit();
  } catch (err) {
    await deleteAuthUserQuietly(cred.user);
    throw err;
  }
}

export async function claimInvite(input: {
  code: string;
  username: string;
  password: string;
}): Promise<void> {
  const code = normalizeInviteCode(input.code);
  const email = kidEmail(input.username); // throws INVALID_USERNAME before any side effect

  const cred = await createUserWithEmailAndPassword(auth, email, input.password);
  const uid = cred.user.uid;

  try {
    const invite = await getInvite(code);
    if (!invite) throw new Error('INVITE_NOT_FOUND');
    if (invite.status !== 'pending') throw new Error('INVITE_NOT_PENDING');
    if (invite.expiresAt < Date.now()) throw new Error('INVITE_EXPIRED');

    const mapping: UserMapping = {
      uid,
      familyId: invite.familyId,
      profileId: invite.profileId,
      role: 'kid',
      email,
      inviteCode: code,
      createdAt: Date.now(),
    };

    // Single batch per D4 — rules cross-validate the three writes with getAfter.
    const batch = writeBatch(db);
    batch.update(inviteDoc(code), { status: 'claimed', claimedByUid: uid });
    batch.set(userDoc(uid), mapping);
    batch.update(profileDoc(invite.familyId, invite.profileId), { uid });
    await batch.commit();
  } catch (err) {
    await deleteAuthUserQuietly(cred.user);
    throw err;
  }
}

// Login form accepts a parent email or a bare kid username.
export async function signInFlexible(input: { identifier: string; password: string }): Promise<void> {
  const id = input.identifier.trim();
  const email = id.includes('@') ? id : kidEmail(id);
  await signInWithEmailAndPassword(auth, email, input.password);
}

export async function signOutUser(): Promise<void> {
  localStorage.removeItem('active_profile_id');
  await signOut(auth);
}
