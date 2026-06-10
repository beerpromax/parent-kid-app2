# PHASE 4 — Authentication, Invites & Firestore Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app off the localStorage shim onto live Firestore with per-member Firebase Auth (email/password), a parent-invites-kid flow, and family-scoped security rules — closing the Phase 1–3 privacy blocker.

**Architecture:** Auth identity is bound to a profile: each Firebase Auth user maps (via a top-level `users/{uid}` doc) to exactly one profile in one family. Parents sign up and create the family; kids join by claiming a single-use invite code that binds their new account to a pre-created kid profile. Security rules derive membership and role from `users/{uid}` and scope all family data to members. The localStorage demo mode (`VITE_USE_LOCAL_STORAGE=true`) keeps working unchanged, with no auth.

**Tech Stack:** React 18 + Vite, Firebase JS SDK v9+ modular (`firebase/auth`, `firebase/firestore`), Firestore security rules v2 (`get`/`getAfter` cross-doc lookups).

> **Persistence:** Live Firestore project `parent-kid-app2` (provisioned, nam5). Email/password provider enabled. **Storage/photos deferred** (no Blaze plan): photo upload UI is gated off in live mode (§D6).

---

## 1. Scope

**In scope**
- Parent signup (email/password) → creates family + parent profile + `users/{uid}` mapping + starter content.
- Parent login, sign-out (both roles).
- Parent manages family members: create kid profiles, generate/revoke single-use invite codes.
- Kid claim flow: invite code + username + password → account bound to the invited kid profile.
- Production Firestore security rules (family-scoped, role-aware) replacing deny-all.
- Live-mode app flow: AuthGate replaces ProfilePicker; current profile derives from the auth mapping.
- Photo upload gating while Storage is deferred.
- Live verification of the Phase 1–3 checklists against real Firestore.

**Out of scope (deferred)**
- Firebase Storage / photo pipeline go-live (needs Blaze).
- Email verification, password reset UX, kid account recovery (parent-driven reset needs Admin SDK / Cloud Functions).
- Server-side enforcement of token arithmetic (needs Cloud Functions; see §D5 honesty note).
- Mobile apps. Multi-family per user. Removing/transferring bound accounts.

## 2. Decisions

| # | Decision | Rationale / consequence |
|---|----------|------------------------|
| D1 | **Auth user ⇄ profile is 1:1 in live mode.** `users/{uid}` = `{ familyId, profileId, role }`. The signed-in user *is* their profile; the ProfilePicker is local-mode only. | Per-member accounts mean identity is no longer chosen per session. Parent devices land on ParentHome, kid devices on KidHome. |
| D2 | **Kids sign in with a username, not an email.** The claim form takes username + password; we synthesize `<username>@kids.parent-kid-app2.firebaseapp.com` for Firebase. Login form accepts either an email or a bare username (same synthesis). | Kids don't have email. Firebase email/password requires an email-shaped string; it is never verified. Usernames are globally unique (collision → `auth/email-already-in-use` → pick another). |
| D3 | **Invite code = the `invites/{code}` document ID.** 8 chars from an unambiguous alphabet, single-use, 7-day expiry, revocable. Top-level collection (not under `families/`) so a not-yet-member kid can `get` it by code. | Rules allow `get` to any signed-in user (code is the secret), `list` only to the family's parents. |
| D4 | **Claim is a 3-write batch validated by rules `getAfter`:** ① invite `pending→claimed` (+`claimedByUid`), ② create `users/{uid}` (carries `inviteCode`), ③ set `uid` on the kid profile. Account is created first; on claim failure the just-created auth user is deleted. | No Cloud Functions needed. Concurrent double-claim loses on the rules check `resource.data.status == 'pending'`. |
| D5 | **Rules enforce membership everywhere and roles where transitions are clean** (completions/redemptions updates parent-only; profile/invite/activity creation parent-only). Token *arithmetic* stays client-enforced. | A malicious kid with dev tools could inflate `tokenBalance` on their own profile (rules allow self balance writes for redemption). Real server-side math needs Cloud Functions — documented deferred item, acceptable for family-internal v1. |
| D6 | **Photos gated by `VITE_ENABLE_PHOTOS`** (false in live mode until Storage exists). Uploader UI hidden; `images.ts` throws `PHOTOS_DISABLED` defensively. | Growth log works text-only in live mode; localStorage demo keeps photos. |
| D7 | **No demo family seeding in live mode.** Parent signup seeds 4 starter activities + 2 starter rewards (no fake kids, no fake balances). `ensureFamily()`'s Firestore branch is removed. | Live data starts honest; demo seeding remains for localStorage mode. |
| D8 | **Starter content is written in a second batch after the signup batch commits.** | Subcollection rules use plain `get()` on `users/{uid}`, which doesn't exist mid-signup-batch. Only the three signup docs (family/profile/users) use `getAfter` rules. |

## 3. Data model changes

### 3.1 New top-level collection `users/{uid}`
```ts
export interface UserMapping {
  uid: string;
  familyId: string;
  profileId: string;
  role: Role;            // 'parent' | 'kid'
  email: string;         // real (parent) or synthesized (kid)
  inviteCode?: string;   // kid accounts only — rules use it to validate the claim batch
  createdAt: number;
}
```
Immutable after create (rules deny update/delete). Readable only by its own uid.

### 3.2 New top-level collection `invites/{code}`
```ts
export type InviteStatus = 'pending' | 'claimed' | 'revoked';
export interface Invite {
  id: string;            // == doc ID == the code
  familyId: string;
  profileId: string;     // kid profile this invite binds
  kidName: string;       // display convenience for the claim screen
  status: InviteStatus;
  createdByUid: string;
  createdAt: number;
  expiresAt: number;     // ms epoch, createdAt + 7 days
  claimedByUid?: string;
}
```

### 3.3 `Profile` gains `uid`
```ts
export interface Profile {
  // ...existing fields...
  uid?: string;          // bound auth account (set at signup for parent, at claim for kid)
}
```

### 3.4 `families/{familyId}` gains `ownerUid`
Set at parent signup; rules anchor for the signup batch.

## 4. Firestore security rules (full replacement of `webapp/firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    // Membership/role derive from the caller's users/{uid} doc (pre-batch state).
    function userData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    // Post-batch state — only for the signup/claim batches where users/{uid}
    // is created in the same commit.
    function userDataAfter() {
      return getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isMember(familyId) {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && userData().familyId == familyId;
    }
    function isParent(familyId) {
      return isMember(familyId) && userData().role == 'parent';
    }

    match /users/{uid} {
      allow get: if isSignedIn() && request.auth.uid == uid;
      allow list: if false;
      allow create: if isSignedIn()
        && request.auth.uid == uid
        && request.resource.data.uid == uid
        && (
          // Parent signup: the family doc created in this batch names this uid as owner.
          (request.resource.data.role == 'parent'
            && getAfter(/databases/$(database)/documents/families/$(request.resource.data.familyId)).data.ownerUid == uid)
          ||
          // Kid claim: the invite (as updated in this batch) is claimed by this uid
          // and points at exactly the family/profile being claimed.
          (request.resource.data.role == 'kid'
            && request.resource.data.inviteCode is string
            && getAfter(/databases/$(database)/documents/invites/$(request.resource.data.inviteCode)).data.claimedByUid == uid
            && getAfter(/databases/$(database)/documents/invites/$(request.resource.data.inviteCode)).data.familyId == request.resource.data.familyId
            && getAfter(/databases/$(database)/documents/invites/$(request.resource.data.inviteCode)).data.profileId == request.resource.data.profileId)
        );
      allow update, delete: if false;
    }

    match /invites/{code} {
      // The code itself is the secret; any signed-in user may fetch one by ID.
      allow get: if isSignedIn();
      allow list: if isSignedIn() && isParent(resource.data.familyId);
      allow create: if isParent(request.resource.data.familyId)
        && request.resource.data.status == 'pending'
        && request.resource.data.createdByUid == request.auth.uid;
      allow update: if
        // revoke, by a parent of the family
        (isParent(resource.data.familyId)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
          && request.resource.data.status == 'revoked')
        ||
        // claim, by the signing-up kid (same batch as users/{uid} create)
        (isSignedIn()
          && resource.data.status == 'pending'
          && resource.data.expiresAt > request.time.toMillis()
          && request.resource.data.status == 'claimed'
          && request.resource.data.claimedByUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'claimedByUid']));
      allow delete: if isParent(resource.data.familyId);
    }

    match /families/{familyId} {
      allow get: if isMember(familyId);
      allow list: if false;
      // Parent signup batch: users/{uid} lands in the same commit.
      allow create: if isSignedIn()
        && request.resource.data.ownerUid == request.auth.uid
        && userDataAfter().familyId == familyId
        && userDataAfter().role == 'parent';
      allow update: if isParent(familyId);
      allow delete: if false;

      match /profiles/{profileId} {
        allow read: if isMember(familyId);
        // userDataAfter covers both the signup batch (doc pending in commit)
        // and steady-state parent adds (doc already exists).
        allow create: if isSignedIn()
          && userDataAfter().familyId == familyId
          && userDataAfter().role == 'parent';
        allow update: if
          isParent(familyId)
          ||
          // kid redeeming: may only touch own bound profile's balance
          (isMember(familyId)
            && resource.data.uid == request.auth.uid
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tokenBalance']))
          ||
          // kid claim batch: bind uid to the invited (unbound) profile
          (isSignedIn()
            && !('uid' in resource.data)
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['uid'])
            && request.resource.data.uid == request.auth.uid
            && userDataAfter().familyId == familyId
            && userDataAfter().profileId == profileId);
        allow delete: if false;
      }

      match /activities/{activityId} {
        allow read: if isMember(familyId);
        allow create: if isParent(familyId);
        // members update: negotiation acceptance applies rate changes from either side
        allow update: if isMember(familyId);
        allow delete: if false;
      }

      match /completions/{completionId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId);
        // approve/reject are parent-only transitions
        allow update: if isParent(familyId);
        allow delete: if false;
      }

      match /ledger/{entryId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId);
        allow update, delete: if false;
      }

      match /rewards/{rewardId} {
        allow read: if isMember(familyId);
        // kids propose wishlist rewards; parents create directly
        allow create: if isMember(familyId);
        allow update: if isMember(familyId);
        allow delete: if false;
      }

      match /redemptions/{redemptionId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId);
        // fulfill/refund are parent-only transitions
        allow update: if isParent(familyId);
        allow delete: if false;
      }

      match /negotiations/{threadId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId);
        allow update: if isMember(familyId);
        allow delete: if false;

        match /offers/{offerId} {
          allow read: if isMember(familyId);
          allow create: if isMember(familyId);
          allow update: if isMember(familyId);
          allow delete: if false;
        }
      }

      match /growthLog/{entryId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId);
        allow update: if isMember(familyId);
        allow delete: if false;
      }
    }
  }
}
```

**Pre-deploy audit note:** `redeemReward` runs a kid-side transaction writing redemption (create ✓ member), own profile `tokenBalance` (✓ self-balance clause), ledger (✓ member create). `approveCompletion` is parent-side (✓ `isParent` everywhere). `acceptCurrentOffer` may be kid-side and updates thread + offers + target activity/reward (✓ member updates). No repo calls `deleteDoc`.

## 5. Tasks

### Task 1: Types, paths, auth export, photo flag
**Files:** Modify `webapp/src/lib/types.ts`, `webapp/src/lib/paths.ts`, `webapp/src/lib/firebase.ts`; Create `webapp/src/lib/config.ts`

- [ ] Add `uid?: string` to `Profile`; append `UserMapping`, `Invite`, `InviteStatus` (code in §3) to `types.ts`.
- [ ] Append to `paths.ts`:
```ts
export const userDoc = (uid: string) => doc(db, 'users', uid);
export const invitesCol = () => collection(db, 'invites');
export const inviteDoc = (code: string) => doc(db, 'invites', code);
```
- [ ] In `firebase.ts`: `import { getAuth, connectAuthEmulator } from 'firebase/auth'`; `const auth = getAuth(app);` export it; inside the existing `useEmulator` block add `connectAuthEmulator(auth, 'http://localhost:9099')` in its own try/catch.
- [ ] Create `config.ts`:
```ts
export const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';
export const photosEnabled = useLocalStorage || import.meta.env.VITE_ENABLE_PHOTOS === 'true';
```
- [ ] `npm run build` → passes. Commit.

### Task 2: Invites repo
**Files:** Create `webapp/src/lib/repos/invites.repo.ts`

- [ ] Implement (live-mode only — invites are meaningless in localStorage mode):
```ts
import { onSnapshot, query, where, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { invitesCol, inviteDoc } from '../paths';
import { Invite } from '../types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteCode(): string {
  let code = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export async function createInvite(familyId: string, profileId: string, kidName: string, createdByUid: string): Promise<Invite> { /* setDoc on inviteDoc(code); status 'pending'; expiresAt = Date.now() + INVITE_TTL_MS; return the invite */ }
export function subscribeInvites(familyId: string, cb: (invites: Invite[]) => void) { /* onSnapshot(query(invitesCol(), where('familyId', '==', familyId))) */ }
export async function getInvite(code: string): Promise<Invite | null> { /* getDoc; normalize code.toUpperCase().trim() */ }
export async function revokeInvite(code: string): Promise<void> { /* updateDoc status: 'revoked' */ }
```
- [ ] Build passes. Commit.

### Task 3: Onboarding orchestration (signup / claim / login)
**Files:** Create `webapp/src/lib/auth/onboarding.ts`

- [ ] `signUpParent({ email, password, parentName, familyName })`:
  1. `createUserWithEmailAndPassword(auth, email, password)`
  2. Batch #1: family doc (`name`, `ownerUid`, `createdAt`) + parent profile (`uid` set, `tokenBalance: 0`, `emoji: '👑'`, `color: '#ff8b3d'`, `createdAt`) + `users/{uid}` mapping. Commit.
  3. Batch #2 (after #1 commits — see D8): the 4 starter activities and 2 starter rewards from `bootstrap.ts`'s Firestore branch, with `assignedKidIds: []` / `forKidIds: []` and `createdByProfileId` = the new parent profile ID. (Drop the Mia-specific items.)
  4. On any post-auth failure: `await cred.user.delete().catch(...)` then rethrow.
- [ ] `claimInvite({ code, username, password })`:
  1. `const email = kidEmail(username)` where `kidEmail = (u) => `${sanitize(u)}@kids.parent-kid-app2.firebaseapp.com``; `sanitize` lowercases and requires `/^[a-z0-9_]{3,20}$/` (throw `INVALID_USERNAME`).
  2. `createUserWithEmailAndPassword`.
  3. `getInvite(code)` → throw `INVITE_NOT_FOUND` / `INVITE_NOT_PENDING` / `INVITE_EXPIRED`.
  4. Single batch per D4: invite update + `users/{uid}` create (with `inviteCode`) + profile `{ uid }` update. Commit.
  5. On failure after account creation: delete the auth user, rethrow.
- [ ] `signInFlexible({ identifier, password })`: if `identifier` contains `@` use as-is, else `kidEmail(identifier)`; `signInWithEmailAndPassword`.
- [ ] `signOutUser()`: `signOut(auth)` and `localStorage.removeItem('active_profile_id')`.
- [ ] Build passes. Commit.

### Task 4: AuthContext
**Files:** Create `webapp/src/app/context/AuthContext.tsx`; Modify `webapp/src/app/providers/AppProviders.tsx`

- [ ] AuthContext exposes `{ firebaseUser, mapping, authLoading }`. `onAuthStateChanged` → if user, `getDoc(userDoc(uid))` → `mapping` (`UserMapping | null`). In localStorage mode, render children directly with `{ firebaseUser: null, mapping: null, authLoading: false }` and never touch `firebase/auth`.
- [ ] Wrap providers: `<AuthProvider><ProfileProvider><DataProvider>`.
- [ ] Build passes. Commit.

### Task 5: ProfileContext live-mode rework
**Files:** Modify `webapp/src/app/context/ProfileContext.tsx`, `webapp/src/lib/bootstrap.ts`

- [ ] Live mode: `familyId` comes from `useAuth().mapping.familyId` (no `ensureFamily()` call); `currentProfile` is auto-resolved as `profiles.find(p => p.id === mapping.profileId)` — `selectProfile`/`clearProfile` become no-ops; `loading` is true until auth resolves + first profiles snapshot.
- [ ] Local mode: existing behavior byte-for-byte (ensureFamily local seed, picker, localStorage `active_profile_id`).
- [ ] Delete the Firestore seeding branch from `ensureFamily()` (D7); keep the local branch. Move/copy the starter activities+rewards literals into `onboarding.ts` (or export them from `bootstrap.ts`) so Task 3 step 3 reuses them.
- [ ] Build passes. Commit.

### Task 6: AuthGate screen
**Files:** Create `webapp/src/app/screens/AuthGate.tsx`

- [ ] Three modes (tabs or toggle links), styled with existing `Card`/`Input`/`Button` components per `guidelines/Guidelines.md`:
  - **Log in** — identifier (email or kid username) + password → `signInFlexible`.
  - **Create family** — family name, your name, email, password (≥8) → `signUpParent`.
  - **Join with invite code** — code, username, password → `claimInvite`.
- [ ] Map Firebase error codes to friendly copy: `auth/email-already-in-use` (parent: "already registered"; kid: "username taken"), `auth/invalid-credential`, `auth/weak-password`, plus `INVITE_*` errors.
- [ ] Build passes. Commit.

### Task 7: App flow gating + sign-out
**Files:** Modify `webapp/src/app/App.tsx`, `webapp/src/app/screens/parent/ParentHome.tsx`, `webapp/src/app/screens/kid/KidHome.tsx`; Create `webapp/src/app/components/SignOutButton.tsx`

- [ ] `App.tsx` (live mode): `authLoading` → spinner; `!firebaseUser` → `<AuthGate />`; `firebaseUser && !mapping` → error card with sign-out (orphaned account; shouldn't happen); else existing role-routed flow. Local mode: unchanged (ProfilePicker etc.).
- [ ] `SignOutButton`: small icon button (`LogOut` from lucide) calling `signOutUser()`; rendered in ParentHome and KidHome headers, live mode only.
- [ ] Build passes. Commit.

### Task 8: Family members management (parent)
**Files:** Create `webapp/src/app/screens/parent/FamilyMembers.tsx`; Modify `webapp/src/app/screens/parent/ParentHome.tsx`

- [ ] New `'family'` tab in ParentHome (label "Family", `Users` icon), rendering `<FamilyMembers />`.
- [ ] FamilyMembers shows: each profile (emoji, name, role, kid link status — "Linked" if `uid` set, else "Not linked"); pending invites (code in monospace + copy button, kid name, expiry, Revoke); claimed/revoked invites collapsed or hidden.
- [ ] "Add kid" dialog: name + emoji preset row + color preset row → existing `createProfile(familyId, { name, role: 'kid', color, emoji })`.
- [ ] "Generate invite code" per unlinked kid → `createInvite(...)` → code displayed immediately.
- [ ] Build passes. Commit.

### Task 9: Photo gating (Storage deferred)
**Files:** Modify `webapp/src/app/components/EntryComposerDialog.tsx`, `webapp/src/lib/images.ts`

- [ ] In EntryComposerDialog: `photosEnabled` (from `lib/config`) — when false, omit the PhotoUploader section (optionally a one-line muted note "Photos are coming soon").
- [ ] In `images.ts` upload entry point: `if (!photosEnabled) throw new Error('PHOTOS_DISABLED');`
- [ ] Verify PhotoGallery/Timeline render fine with `photos: []`.
- [ ] Build passes. Commit.

### Task 10: Deploy production rules
**Files:** Modify `webapp/firestore.rules`

- [ ] Replace deny-all with §4 rules verbatim.
- [ ] Re-run the §4 pre-deploy audit greps (`grep -n "updateDoc\|setDoc\|runTransaction\|deleteDoc" src/lib/repos/*.ts`) — confirm no write pattern exists that the rules would block.
- [ ] Deploy (`firebase deploy --only firestore` or MCP deploy tool). Verify in console that rules are live.
- [ ] Commit.

### Task 11: Live verification (§6 checklist)
- [ ] Run the full §6 checklist with `npm run dev` against live Firestore. Record any composite-index errors Firestore raises (console error includes a create-index link) and add them to `firestore.indexes.json`, redeploy, re-test.

### Task 12: Docs + push
- [ ] Update root `README.md` status section (Firestore live, auth done, photos deferred).
- [ ] Commit and push all work.

## 6. Verification checklist (live Firestore)

**Onboarding**
- [ ] Create family (parent signup) → lands on ParentHome; Firestore console shows `families/{id}`, parent profile with `uid`, `users/{uid}`, 4 starter activities, 2 starter rewards.
- [ ] Reload → session persists, straight to ParentHome (no picker).
- [ ] Add kid profile → appears in Family tab, "Not linked".
- [ ] Generate invite → code visible; `invites/{code}` pending in console.
- [ ] In a second browser profile/incognito: claim with code + username + password → lands on KidHome as that kid; invite shows claimed; profile shows Linked.
- [ ] Kid logs out, logs back in with bare username + password.
- [ ] Claiming the same code again (third browser) → friendly error, no auth account left behind (check Firebase console → Authentication).
- [ ] Revoked invite cannot be claimed. Expired invite (manually set `expiresAt` past in console) cannot be claimed.

**Phase 1–3 regression (live)**
- [ ] Phase 1 §11: kid submits completion → parent approves → balance + ledger update live in both browsers; approve is idempotent (double-click).
- [ ] Phase 2 §11: redemption with sufficient/insufficient tokens; negotiation open→counter→accept including the self-accept guard (`CANNOT_ACCEPT_YOUR_OWN_OFFER`); streak bonus.
- [ ] Phase 3 §11 (text-only): create/edit/trash/restore growth entries from both roles; photos section hidden.

**Security rules (negative tests — do these from the kid's browser console or a 3rd account)**
- [ ] Second parent signup (different email) creates family B; user B cannot `getDoc` family A's docs (permission denied).
- [ ] Kid cannot `updateDoc` a completion (approve/reject path denied).
- [ ] Kid cannot update another profile's `tokenBalance`, or any field of their own profile other than `tokenBalance`.
- [ ] Kid cannot create an invite; signed-out client can read nothing.
- [ ] `users/{otherUid}` unreadable; invites `list` denied for kids.

**Indexes**
- [ ] All screens load without composite-index errors (or indexes added + deployed).

## 7. Deferred / follow-ups
- Storage go-live (Blaze): flip `VITE_ENABLE_PHOTOS=true`, write Storage rules mirroring family membership, run Phase 3 photo checklist.
- Cloud Functions for server-enforced token math + parent-driven kid password reset.
- Password reset emails for parents (`sendPasswordResetEmail`) — trivial, add with first real user.
- Rules unit tests (`@firebase/rules-unit-testing` + emulator) if rules grow further.

## 8. Verification record (2026-06-10, live project `parent-kid-app2`)

All tasks executed and verified against live Firestore. Results:

**Passed (UI, via dev server + browser automation):** parent signup → ParentHome with starter content; session persistence across reloads; add kid + invite generation; kid claim via code (`username` login, synthesized email); completion submit (kid) → approve (parent) → balance +5, streak 1, ledger entry, status `approved`; redemption blocked on insufficient tokens; negotiation open (kid, 10) → no self-accept affordance → parent accept → reward cost 15→10, status restored `active`; growth log text-only entry with mood tag; photo uploader absent in live mode.

**Passed (rules negative-tests, via Firestore REST with real ID tokens):** unauthenticated read denied; foreign account cannot read family docs, profiles, or others' `users/{uid}`; cannot forge a `users/{uid}` mapping into another family; kid cannot approve completions, edit others' profiles, edit own profile beyond `tokenBalance`, create invites, or list invites; claimed invite cannot be re-claimed. (12/12 denied/allowed as designed.)

**Issues found & fixed during verification:**
1. **Missing composite indexes** (activities `status+createdAt`; growthLog `kidId+status+date+createdAt` and `kidId+date+createdAt`) — app hung on the loading screen because DataContext never received the activities snapshot. Added to `firestore.indexes.json`, deployed. *Lesson: a missing index doesn't degrade — it bricks the screen.*
2. **`setDoc` with `undefined` fields threw on live Firestore** (growth-log save failed silently from the user's perspective; the localStorage shim drops `undefined` via JSON serialization). Fixed globally with `initializeFirestore(app, { ignoreUndefinedProperties: true })` in `firebase.ts` — exactly the class of shim-vs-live divergence Phase 4 existed to surface.

**Known cosmetic quirks (pre-existing / acceptable):** transient `permission-denied` listener errors during the signup commit window (listeners re-attach and recover); ParentHome tab resets to Activities when profile data changes (context remount churn); negotiation thread shows counterparty as "Unknown" before the other side replies; shadcn `forwardRef` dev warnings.
