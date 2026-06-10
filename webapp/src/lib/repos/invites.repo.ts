import { onSnapshot, query, where, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { invitesCol, inviteDoc } from '../paths';
import { Invite } from '../types';

// Invites only exist in live (Firestore) mode — the localStorage demo has no auth.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I lookalikes
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function createInvite(
  familyId: string,
  profileId: string,
  kidName: string,
  createdByUid: string
): Promise<Invite> {
  const code = generateInviteCode();
  const invite: Invite = {
    id: code,
    familyId,
    profileId,
    kidName,
    status: 'pending',
    createdByUid,
    createdAt: Date.now(),
    expiresAt: Date.now() + INVITE_TTL_MS,
  };
  await setDoc(inviteDoc(code), invite);
  return invite;
}

export function subscribeInvites(familyId: string, cb: (invites: Invite[]) => void) {
  const q = query(invitesCol(), where('familyId', '==', familyId));
  return onSnapshot(q, (snapshot) => {
    const invites: Invite[] = [];
    snapshot.forEach((doc) => {
      invites.push({ id: doc.id, ...doc.data() } as Invite);
    });
    invites.sort((a, b) => b.createdAt - a.createdAt);
    cb(invites);
  });
}

export async function getInvite(code: string): Promise<Invite | null> {
  const snap = await getDoc(inviteDoc(normalizeInviteCode(code)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Invite;
}

export async function revokeInvite(code: string): Promise<void> {
  await updateDoc(inviteDoc(code), { status: 'revoked' });
}
