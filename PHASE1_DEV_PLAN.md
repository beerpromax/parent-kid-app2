# Phase 1 Development Plan — Family Coordination Webapp
*Multi-agent task spec. Build target: the existing `@figma/my-make-file` React + Vite scaffold.*

> **Status:** Ready for distribution to a multi-agent build system (e.g. Claude Code sub-agents).
> **Scope:** Phase 1 only — the core `create → complete → submit → approve → credit` loop, multi-kid aware.
> **Persistence:** Firebase (Firestore), **no Firebase Auth** (local profile selection).
> **Source of truth for product logic:** `family_app_PRD_draft.md`.
> **Source of truth for UI patterns / repo layout:** `PROJECT_GUIDE.md`.

---

## 0. How the orchestrator should use this document

1. **Build `WS0` (Foundation & Contracts) FIRST and completely.** Every other workstream codes against the types, the Firestore schema, the repository API, and the profile context defined there. Do **not** start parallel work until WS0's contracts (§5) are merged and stable.
2. After WS0, **WS1–WS5 can run in parallel** (see the DAG in §9). They only ever touch the data layer through the repository functions in §5.3 — they never write `firestore` calls directly inside UI components.
3. **WS6 (Integration & Verification) runs last.**
4. Every task lists: **Goal · Files · Functions/logic · UI components · Depends on · Acceptance criteria.** An agent's task is "done" only when the acceptance criteria pass via the manual verification checklist (§11).
5. **Do not build anything in §12 (Out of Scope).** If a feature isn't in this doc, it belongs to Phase 2/3.

---

## 1. Scope

### 1.1 In scope (Phase 1)
- Firebase project + Firestore wiring into the existing Vite app.
- A typed **data-access (repository) layer** over Firestore with realtime subscriptions.
- **Local profile system**: one family, one parent profile, multiple kid profiles. The "current user" is chosen locally and remembered in `localStorage`. No passwords, no login.
- **Parent — Activity Management**: create / edit / archive activities (title, description, duration, token value, kid assignment).
- **Parent — Approval Inbox**: see all pending completion submissions across kids; approve (credits tokens) or reject.
- **Parent — Family Dashboard**: lightweight per-kid overview (token balance + pending count).
- **Kid — Activity View**: see assigned activities with their token reward and current state (available / pending / approved / rejected).
- **Kid — Submit Completion**: mark an activity done (with optional note) → creates a pending record for parent review.
- **Kid — Token Wallet (lite)**: current balance + recent credit history. (Full wallet + progress-to-reward bar is Phase 2.)
- **Realtime sync**: a parent approval reflects on the kid's screen without refresh; balances update live.
- **Token integrity**: crediting happens inside a Firestore transaction; double-approval cannot double-credit.

### 1.2 Out of scope — DO NOT BUILD (see §12 for the full list)
Reward redemption / spending tokens · the negotiation mechanism · streak bonuses · the growth journey log · real authentication / invite flows · video. These belong to Phase 2/3.

---

## 2. Architectural decisions & assumptions
*(Decisions marked ⚙️ are reasonable defaults chosen to remove ambiguity — override before the agents start if you disagree.)*

| # | Decision | Notes |
|---|----------|-------|
| D1 | **Firebase Firestore** is the database; the Web SDK v10+ modular API is used. | Realtime listeners (`onSnapshot`) drive parent↔kid sync. |
| D2 | **No Firebase Auth.** A single family is identified by a `familyId`; profiles live under it. | ⚠️ **Security TODO:** Firestore runs in open/test mode in v1. Lock down before any public deploy. |
| D3 ⚙️ | `familyId` is created once on first run and stored in `localStorage` (`fam_id`). A bootstrap seeds one parent + two demo kids + sample activities. | Keeps the app usable on a fresh machine with zero setup. |
| D4 ⚙️ | "Current profile" is selected via a **profile switcher** (replaces the existing parent/kid `mode` toggle) and persisted in `localStorage` (`active_profile_id`). | Netflix-style profile picker. |
| D5 ⚙️ | Navigation is **tab/section state inside each role** (reuse the existing `tabs.tsx` / a simple nav), **not** a new router dependency. | Minimizes additions to the scaffold. Add `react-router-dom` only if the orchestrator prefers it — keep it out otherwise. |
| D6 ⚙️ | An activity can be **completed repeatedly over time** (chores recur), but a kid may have **only one *pending* completion per activity at a time** (a soft "lock" echoing the PRD's negotiation lock). | Prevents spammy duplicate submissions. |
| D7 ⚙️ | The token value is **snapshotted onto the completion at submission time** (`tokenValueSnapshot`) and that snapshot is what gets credited on approval. | Phase 1 has no negotiation, so this is always equal to the live value — but it makes the data model forward-compatible with Phase 2's "settle at the approval-time rate" rule. |
| D8 ⚙️ | The existing **rewards UI is kept as a read-only "Coming soon" stub** (disabled redeem buttons). | Keeps the kid screen coherent without building Phase 2 spending. The orchestrator may instead hide rewards entirely. |
| D9 | **Build on the existing scaffold.** Reuse the Radix/Shadcn primitives in `src/app/components/ui/`. Do not introduce a second UI kit or custom CSS unless unavoidable. | Per `PROJECT_GUIDE.md` §10. |
| D10 ⚙️ | State is provided through **React context** (profile/session + live data). No Redux/Zustand/etc. | Scaffold is small; context is sufficient. |

---

## 3. Target file / folder structure
*Agents create files under these paths. Existing scaffold files are noted; everything else is new.*

```
src/
├─ app/
│  ├─ App.tsx                         # (existing) → refactor into shell + providers + role router
│  ├─ providers/
│  │  └─ AppProviders.tsx             # wraps Profile + Data context providers
│  ├─ context/
│  │  ├─ ProfileContext.tsx           # current family + current profile + switch/persist
│  │  └─ DataContext.tsx              # live activities/completions/ledger via subscriptions
│  ├─ screens/
│  │  ├─ ProfilePicker.tsx            # WS0 — choose who is using the app
│  │  ├─ parent/
│  │  │  ├─ ParentHome.tsx            # WS0 shell + tab nav for parent
│  │  │  ├─ ActivityManager.tsx       # WS1
│  │  │  ├─ ActivityFormDialog.tsx    # WS1
│  │  │  ├─ ApprovalInbox.tsx         # WS2
│  │  │  └─ FamilyDashboard.tsx       # WS3
│  │  └─ kid/
│  │     ├─ KidHome.tsx               # WS0 shell + tab nav for kid
│  │     ├─ ActivityList.tsx          # WS4
│  │     ├─ SubmitCompletionDialog.tsx# WS4
│  │     ├─ TokenWallet.tsx           # WS5
│  │     └─ RewardsComingSoon.tsx     # WS5 (stub)
│  └─ components/
│     ├─ ui/                          # (existing) Radix/Shadcn primitives — REUSE
│     ├─ figma/ImageWithFallback.tsx  # (existing)
│     ├─ ProfileBadge.tsx             # WS0 — avatar + name chip
│     ├─ TokenChip.tsx                # WS0 — token amount pill (reused everywhere)
│     ├─ ActivityCard.tsx            # WS1/WS4 — shared presentational card
│     ├─ CompletionStatusBadge.tsx    # WS2/WS4 — pending/approved/rejected badge
│     └─ EmptyState.tsx               # WS6 — shared empty/error placeholder
├─ lib/
│  ├─ firebase.ts                     # WS0 — Firebase app + Firestore init
│  ├─ types.ts                        # WS0 — domain types (THE contract)
│  ├─ paths.ts                        # WS0 — Firestore collection path helpers
│  ├─ bootstrap.ts                    # WS0 — seed demo family on first run
│  └─ repos/
│     ├─ profiles.repo.ts             # WS0
│     ├─ activities.repo.ts           # WS0
│     ├─ completions.repo.ts          # WS0
│     └─ ledger.repo.ts               # WS0
├─ main.tsx                           # (existing)
└─ styles/                            # (existing)
.env.local                            # WS0 — Firebase config (gitignored)
```

---

## 4. Conventions & guardrails (all agents must follow)

- **File naming:** kebab-case for `lib`/utility files; PascalCase for React components/screens. (`PROJECT_GUIDE.md` §10.)
- **UI:** import from `src/app/components/ui/*`. Mapping of features → primitives is given per task. Avoid bespoke CSS; use Tailwind utilities.
- **Data access:** UI/screens call **repository functions only** (§5.3). No `getDoc`/`setDoc`/`onSnapshot` inside components.
- **Immutability:** functional state updates (`setX(prev => …)`).
- **Accessibility:** every interactive control has visible text or `aria-label`.
- **No duplicate IDs:** Firestore `addDoc` generates IDs; never hardcode collisions.
- **Money/token math:** integers only. Never allow negative balances. Credits go through `approveCompletion` (transaction) — never increment a balance directly in a component.
- **Toasts:** use the existing `sonner` toast for success/error feedback.
- **Confetti:** reuse the existing `canvas-confetti` import; fire on (a) successful kid submission and (b) when a watched completion flips to `approved` in realtime.
- **Loading/empty/error:** every list screen handles all three states using `EmptyState` and a skeleton (`skeleton.tsx`).
- **Do not** run destructive git commands or hard-delete data; archiving is a status flag, not a `deleteDoc` (see D6/types).

---

## 5. SHARED CONTRACTS — build first (WS0), freeze before parallel work

### 5.1 Domain types — `src/lib/types.ts`

```ts
export type Role = 'parent' | 'kid';

export interface Profile {
  id: string;
  familyId: string;
  name: string;
  role: Role;
  color?: string;        // avatar accent (hex or tailwind token)
  emoji?: string;        // simple avatar
  tokenBalance: number;  // meaningful for kids; parents keep 0
  createdAt: number;     // epoch ms
}

export type ActivityStatus = 'active' | 'archived'; // 'negotiating' RESERVED for Phase 2 — do not use

export interface Activity {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  tokenValue: number;          // current live value
  assignedKidIds: string[];    // empty array => assigned to ALL kids
  status: ActivityStatus;
  createdByProfileId: string;
  createdAt: number;
  updatedAt: number;
}

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export interface Completion {
  id: string;
  familyId: string;
  activityId: string;
  activityTitleSnapshot: string; // denormalized for display/history
  tokenValueSnapshot: number;    // rate captured at submission (D7)
  kidId: string;
  status: CompletionStatus;
  note?: string;                 // optional kid note
  submittedAt: number;
  reviewedAt?: number;
  reviewedByProfileId?: string;
  settledTokens?: number;        // set on approval == tokenValueSnapshot in P1
}

export interface LedgerEntry {
  id: string;
  familyId: string;
  kidId: string;
  delta: number;                 // +tokens (P1 only ever credits)
  reason: 'activity_approved';   // 'reward_redeemed' RESERVED for Phase 2
  relatedCompletionId?: string;
  balanceAfter: number;
  createdAt: number;
}
```

### 5.2 Firestore layout — `src/lib/paths.ts`

```
families/{familyId}                          (doc: { name, createdAt })
families/{familyId}/profiles/{profileId}     → Profile
families/{familyId}/activities/{activityId}  → Activity
families/{familyId}/completions/{completionId} → Completion
families/{familyId}/ledger/{entryId}         → LedgerEntry
```
Provide path helpers, e.g. `profilesCol(familyId)`, `activityDoc(familyId, id)`, etc. **All repos use these helpers** so paths live in one place.

### 5.3 Repository API — the interface every screen codes against
*Signatures are the contract. WS0 implements them; WS1–WS5 only call them.*

```ts
// profiles.repo.ts
subscribeProfiles(familyId: string, cb: (p: Profile[]) => void): Unsubscribe;
getProfile(familyId: string, profileId: string): Promise<Profile | null>;
createProfile(familyId: string, input: Pick<Profile,'name'|'role'|'color'|'emoji'>): Promise<string>;

// activities.repo.ts
subscribeActivities(familyId: string, cb: (a: Activity[]) => void): Unsubscribe; // active only, sorted by createdAt
createActivity(familyId: string, input: {
  title: string; description?: string; durationMinutes?: number;
  tokenValue: number; assignedKidIds: string[]; createdByProfileId: string;
}): Promise<string>;
updateActivity(familyId: string, id: string, patch: Partial<Pick<Activity,
  'title'|'description'|'durationMinutes'|'tokenValue'|'assignedKidIds'>>): Promise<void>;
archiveActivity(familyId: string, id: string): Promise<void>; // sets status='archived'

// completions.repo.ts
subscribeCompletions(familyId: string, opts: { status?: CompletionStatus; kidId?: string },
  cb: (c: Completion[]) => void): Unsubscribe;
hasPendingCompletion(familyId: string, activityId: string, kidId: string): Promise<boolean>;
submitCompletion(familyId: string, input: {
  activityId: string; kidId: string; note?: string;
}): Promise<string>; // snapshots title + tokenValue from the activity (D7); rejects if a pending one exists (D6)
approveCompletion(familyId: string, completionId: string, reviewerId: string): Promise<void>; // TRANSACTION, see §5.4
rejectCompletion(familyId: string, completionId: string, reviewerId: string): Promise<void>;

// ledger.repo.ts
subscribeLedger(familyId: string, kidId: string, cb: (e: LedgerEntry[]) => void): Unsubscribe; // newest first, limit 20
```

### 5.4 `approveCompletion` transaction logic (must be exact)
Inside `runTransaction`:
1. Read the completion. **If `status !== 'pending'`, abort (no-op)** — guarantees idempotency / no double-credit.
2. Read the kid profile.
3. Compute `newBalance = kid.tokenBalance + completion.tokenValueSnapshot`.
4. Update completion: `status='approved'`, `reviewedAt=now`, `reviewedByProfileId=reviewerId`, `settledTokens=tokenValueSnapshot`.
5. Update kid profile: `tokenBalance = newBalance`.
6. Create a ledger entry: `delta=+tokenValueSnapshot`, `reason='activity_approved'`, `relatedCompletionId`, `balanceAfter=newBalance`.

`rejectCompletion`: set `status='rejected'`, `reviewedAt`, `reviewedByProfileId`. No balance change, no ledger entry.

### 5.5 Profile/session context — `ProfileContext.tsx`
Exposes:
```ts
{
  familyId: string;
  profiles: Profile[];               // live
  currentProfile: Profile | null;    // resolved from localStorage 'active_profile_id'
  isParent: boolean;
  selectProfile(profileId: string): void; // persists to localStorage
  clearProfile(): void;
  loading: boolean;
}
```
On mount: ensure `familyId` exists (create+seed via `bootstrap.ts` if absent, D3), subscribe to profiles, resolve current profile.

---

## 6. Workstream summary

| WS | Title | Owner agent | Depends on | Parallel? |
|----|-------|-------------|------------|-----------|
| **WS0** | Foundation & Contracts | Agent A (blocking) | — | No (must finish first) |
| **WS1** | Parent · Activity Management | Agent B | WS0 | Yes |
| **WS2** | Parent · Approval Inbox | Agent C | WS0 | Yes |
| **WS3** | Parent · Family Dashboard | Agent D | WS0 | Yes |
| **WS4** | Kid · Activity View & Submission | Agent E | WS0 | Yes |
| **WS5** | Kid · Token Wallet (lite) | Agent F | WS0 | Yes |
| **WS6** | Integration & Verification | Agent A/G | WS1–WS5 | No (last) |

---

## 7. Detailed task breakdown

### WS0 — Foundation & Contracts *(blocking; complete before any parallel work)*

#### T0.1 — Firebase install & init
- **Goal:** App can talk to Firestore.
- **Files:** `src/lib/firebase.ts`, `.env.local`, `package.json`.
- **Functions/logic:** `pnpm add firebase`. Read config from `import.meta.env.VITE_FIREBASE_*`. Export `db` (Firestore). Add `.env.local` to `.gitignore`. Document required env keys in README.
- **Acceptance:** A throwaway `getDocs` call against an empty collection resolves without auth errors.

#### T0.2 — Domain types
- **Goal:** The shared contract exists.
- **Files:** `src/lib/types.ts` (exactly §5.1), `src/lib/paths.ts` (exactly §5.2).
- **Acceptance:** Types compile; `paths.ts` helpers return correct collection/doc refs.

#### T0.3 — Bootstrap & seed
- **Goal:** A fresh machine has a usable family.
- **Files:** `src/lib/bootstrap.ts`.
- **Functions/logic:** `ensureFamily(): Promise<string>` — if `localStorage.fam_id` missing, create a family doc, 1 parent (`name:'Parent'`), 2 kids (`name:'Mia'`,`'Leo'`, distinct colors/emojis), and 3–4 sample activities; store id in `localStorage`. Idempotent.
- **Acceptance:** First load creates the family + profiles + sample activities; reload does not duplicate them.

#### T0.4 — Repositories
- **Goal:** All data access centralized and typed.
- **Files:** `src/lib/repos/{profiles,activities,completions,ledger}.repo.ts`.
- **Functions/logic:** Implement every signature in §5.3. `approveCompletion`/`rejectCompletion` per §5.4. `submitCompletion` snapshots title + `tokenValue` from the activity and calls `hasPendingCompletion` first (throw a typed error if one exists, D6). Subscriptions return the `Unsubscribe` and convert snapshots to typed objects (include doc `id`).
- **Acceptance:** Each function works against the live emulator/db; transaction credits exactly once even if called twice.

#### T0.5 — Profile context
- **Goal:** "Who am I" resolved and persisted.
- **Files:** `src/app/context/ProfileContext.tsx`, `src/app/context/DataContext.tsx`.
- **Functions/logic:** `ProfileContext` per §5.5. `DataContext` subscribes (scoped to current profile where relevant) to activities, completions, ledger; exposes live arrays + loading flags; tears down subscriptions on unmount/profile switch.
- **Acceptance:** Switching profiles re-scopes data and survives a page reload.

#### T0.6 — App shell refactor + shared mini-components
- **Goal:** Replace the monolithic `App.tsx` mode toggle with a profile-driven shell.
- **Files:** `App.tsx`, `providers/AppProviders.tsx`, `screens/ProfilePicker.tsx`, `screens/parent/ParentHome.tsx`, `screens/kid/KidHome.tsx`, `components/{ProfileBadge,TokenChip,ActivityCard,CompletionStatusBadge,EmptyState}.tsx`.
- **Functions/logic:** `App` renders `AppProviders` → if no `currentProfile` show `ProfilePicker`; else route by `isParent` to `ParentHome` (tabs: Activities / Approvals / Dashboard) or `KidHome` (tabs: Activities / Wallet). Build the shared presentational components (props-only, no data fetching). Migrate any reusable JSX out of the old `App.tsx`.
- **UI components:** `tabs.tsx`, `card.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`.
- **Acceptance:** Picking a parent profile lands on the parent tabs; picking a kid lands on kid tabs; a "switch profile" control returns to the picker.

---

### WS1 — Parent · Activity Management

#### T1.1 — Activity list screen
- **Goal:** Parent sees all active activities.
- **Files:** `screens/parent/ActivityManager.tsx`.
- **Logic:** consume `DataContext` activities; render via `ActivityCard` (show title, duration, token value via `TokenChip`, assigned-kid avatars). Loading→skeleton; empty→`EmptyState` with a "Create activity" CTA.
- **UI:** `card.tsx`, `button.tsx`, `skeleton.tsx`, `avatar.tsx`.
- **Depends on:** WS0.
- **Acceptance:** Lists seeded activities; reflects creates/edits/archives in realtime.

#### T1.2 — Create/Edit activity dialog
- **Goal:** CRUD form.
- **Files:** `screens/parent/ActivityFormDialog.tsx`.
- **Functions/logic:** controlled fields — title (required), description, durationMinutes (number ≥0), tokenValue (integer ≥1, required), assignedKidIds (multi-select of kids; none selected ⇒ all). On submit call `createActivity` or `updateActivity`. Validate before write; toast on success/error. **No HTML `<form>` tag** — use `onClick` handlers (`PROJECT_GUIDE` / artifact rule).
- **UI:** `dialog.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`/`checkbox.tsx`, `button.tsx`, `sonner`.
- **Depends on:** WS0; reads profiles (kids) from context.
- **Acceptance:** Creating an activity makes it appear in T1.1 live; editing updates it; validation blocks empty title / tokenValue<1.

#### T1.3 — Archive activity
- **Goal:** Remove an activity from circulation without hard delete (D6).
- **Files:** within `ActivityManager.tsx` / `ActivityCard` action.
- **Logic:** confirm via `alert-dialog.tsx`, then `archiveActivity`. Archived activities disappear from active lists and from kids' views.
- **Acceptance:** Archived activity vanishes from both parent and kid lists in realtime; not destroyed in DB.

---

### WS2 — Parent · Approval Inbox

#### T2.1 — Pending list
- **Goal:** Parent sees every pending completion across all kids.
- **Files:** `screens/parent/ApprovalInbox.tsx`.
- **Logic:** `subscribeCompletions(familyId, { status:'pending' }, …)` via context; each row shows kid name (resolve from profiles), activity title snapshot, token value, submitted time, optional note. Sort oldest-first.
- **UI:** `card.tsx`, `badge.tsx` (`CompletionStatusBadge`), `avatar.tsx`, `button.tsx`.
- **Depends on:** WS0.
- **Acceptance:** A kid's new submission appears here within ~1s without refresh.

#### T2.2 — Approve action
- **Goal:** Credit tokens safely.
- **Logic:** button → `approveCompletion(familyId, id, currentProfile.id)`. Disable button while in flight to prevent double taps; success toast shows "+N tokens to {kid}". Row leaves the pending list automatically (status change).
- **Acceptance:** Kid balance increases by exactly the snapshot value; a ledger entry is created; re-clicking cannot double-credit.

#### T2.3 — Reject action
- **Logic:** button → confirm → `rejectCompletion`. No balance change. Toast "Submission rejected".
- **Acceptance:** Row leaves pending; kid sees a rejected state (WS4) and may resubmit.

#### T2.4 — States
- **Logic:** loading skeleton, empty state ("No pending approvals 🎉"), error fallback.
- **Acceptance:** All three render correctly.

---

### WS3 — Parent · Family Dashboard

#### T3.1 — Per-kid summary cards
- **Goal:** At-a-glance family overview.
- **Files:** `screens/parent/FamilyDashboard.tsx`.
- **Logic:** for each kid profile, a card with: avatar+name, current `tokenBalance` (`TokenChip`), count of pending completions for that kid (derive from completions in context), and last credited timestamp (from ledger or last approved completion). Read-only.
- **UI:** `card.tsx`, `avatar.tsx`, `badge.tsx`, `progress.tsx` (optional decorative).
- **Depends on:** WS0.
- **Acceptance:** Balances and pending counts update live as approvals happen; matches the kid's own wallet view.

---

### WS4 — Kid · Activity View & Submission

#### T4.1 — Today's activities
- **Goal:** Kid sees what they can do.
- **Files:** `screens/kid/ActivityList.tsx`.
- **Logic:** from context activities, filter to those assigned to the current kid (`assignedKidIds` empty ⇒ included). For each, derive its state from the kid's completions: `available` (no pending), `pending` (has a pending completion), or show last result. Display token reward via `TokenChip` and `CompletionStatusBadge`.
- **UI:** `ActivityCard`, `badge.tsx`, `button.tsx`.
- **Depends on:** WS0.
- **Acceptance:** Only assigned, active activities show; a pending activity shows the pending badge and a disabled "Submit" button (D6).

#### T4.2 — Submit completion dialog
- **Goal:** Kid marks something done.
- **Files:** `screens/kid/SubmitCompletionDialog.tsx`.
- **Logic:** confirm dialog with optional note; on confirm call `submitCompletion(familyId,{activityId,kidId,note})`. Fire confetti + success toast ("Sent to {parent} for approval"). Handle the "already pending" error gracefully.
- **UI:** `dialog.tsx`, `textarea.tsx`, `button.tsx`, `sonner`, `canvas-confetti`.
- **Depends on:** WS0.
- **Acceptance:** Creates a pending completion (visible in WS2); the activity flips to pending state immediately.

#### T4.3 — Result states
- **Logic:** approved completions show a brief celebratory badge; rejected show a "Try again" affordance that re-enables submit.
- **Acceptance:** Reject → kid can resubmit; approve → activity returns to `available` for the next round (recurring, D6).

#### T4.4 — Realtime approval celebration
- **Logic:** when a completion the kid is watching flips `pending → approved` via the live subscription, fire confetti + toast "+N tokens!".
- **Acceptance:** With parent and kid open side-by-side, approving in WS2 triggers the kid celebration without refresh.

---

### WS5 — Kid · Token Wallet (lite)

#### T5.1 — Balance + history
- **Goal:** Kid sees their tokens.
- **Files:** `screens/kid/TokenWallet.tsx`.
- **Logic:** big balance number from `currentProfile.tokenBalance`; recent credits list from `subscribeLedger(familyId, kidId)` (newest 20) showing `+delta`, reason, time.
- **UI:** `card.tsx`, `TokenChip`, `separator.tsx`, `scroll-area.tsx`.
- **Depends on:** WS0.
- **Acceptance:** Balance matches dashboard; new credits appear live after approval.

#### T5.2 — Rewards "Coming soon" stub (D8)
- **Goal:** Placeholder for Phase 2 spending without building it.
- **Files:** `screens/kid/RewardsComingSoon.tsx`.
- **Logic:** reuse/repurpose the scaffold's static rewards display but **disable all redeem buttons** and show a "Coming soon" overlay/badge. No token spending logic. (Or hide entirely if the orchestrator prefers.)
- **Acceptance:** No way to spend tokens exists; clearly labeled as upcoming.

---

### WS6 — Integration & Verification *(last)*

| Task | Goal | Acceptance |
|------|------|------------|
| T6.1 | Cross-role realtime check | Parent approve / archive instantly reflected on kid screen. |
| T6.2 | Consistent loading/empty/error | Every list screen uses `EmptyState` + skeleton; no raw spinners or blank screens. |
| T6.3 | Token integrity test | Manually double-approve (rapid clicks / two tabs) → balance increments once; ledger has one entry. Balance never goes negative; no path spends tokens. |
| T6.4 | Manual verification run | Execute the §11 checklist end-to-end with 2 kids. |
| T6.5 | Docs | Update `README.md`: env setup, Firebase config keys, "Phase 1 scope / what's stubbed", how to switch profiles. |

---

## 8. Logic rules reference (single source of truth for edge cases)

1. **One pending per (kid, activity)** — `submitCompletion` rejects if `hasPendingCompletion` is true. (D6)
2. **Recurring** — after approval/rejection an activity becomes available again. (D6)
3. **Rate snapshot** — credited tokens = `tokenValueSnapshot` taken at submission, not the live value at approval. (D7) In Phase 1 these are equal; the rule exists for Phase 2 forward-compat.
4. **Idempotent approval** — `approveCompletion` no-ops if the completion isn't `pending`. (§5.4)
5. **No negative balances; integer tokens only.** Phase 1 only ever credits.
6. **Assignment** — `assignedKidIds` empty ⇒ activity is for all kids.
7. **Archive ≠ delete** — `status='archived'`, never `deleteDoc`.

---

## 9. Sequencing / parallelization (DAG)

```
            ┌──────────── WS0 (blocking) ────────────┐
            │ T0.1 → T0.2 → T0.3/T0.4 → T0.5 → T0.6   │
            └───────────────┬─────────────────────────┘
                            │  (contracts frozen)
        ┌───────────┬───────┼───────────┬───────────┐
        ▼           ▼       ▼           ▼           ▼
       WS1         WS2     WS3         WS4         WS5     ← run in parallel
        └───────────┴───────┴─────┬─────┴───────────┘
                                   ▼
                                  WS6  (integration + verification)
```
- **Critical path:** WS0 → (longest of WS1–WS5, likely WS1 or WS4) → WS6.
- WS1–WS5 share only the §5 contracts + the shared mini-components from T0.6; if two agents both need a shared component, T0.6 must ship it (don't fork it).

---

## 10. Integration milestones / demo script
The build is "Phase 1 complete" when this end-to-end flow works on a fresh machine:
1. Open app → profile picker shows Parent + 2 kids (seeded).
2. As **Parent**, create an activity "Read 20 min = 5 tokens", assigned to both kids.
3. Switch to **Kid Mia** → see the activity → submit with a note → confetti → activity shows *pending*.
4. Switch to **Parent → Approvals** → Mia's submission is listed → approve.
5. Switch to **Kid Mia → Wallet** → balance went up by 5, ledger shows the credit; activity is available again.
6. Switch to **Kid Leo** → same activity is available and independent (Leo's balance unaffected by Mia).
7. **Parent → Dashboard** → both kids' balances/pending counts are correct.
8. Reject path: Leo submits, parent rejects, Leo can resubmit, no tokens granted.

---

## 11. Manual verification checklist (WS6)
- [ ] Fresh load seeds exactly one family, one parent, two kids, sample activities (no duplicates on reload).
- [ ] Profile selection persists across reload.
- [ ] Parent can create / edit / archive activities; changes appear live for kids.
- [ ] Validation blocks empty title and `tokenValue < 1`.
- [ ] Kid sees only assigned, active activities.
- [ ] Submitting creates a pending record; duplicate pending submission is blocked.
- [ ] Approval credits the correct kid by exactly the snapshot amount; ledger entry created.
- [ ] Double/rapid approval does **not** double-credit.
- [ ] Reject grants no tokens and allows resubmission.
- [ ] Wallet balance == dashboard balance == sum of credited ledger.
- [ ] Realtime: approval triggers kid-side confetti/toast without refresh.
- [ ] No UI path can spend tokens (rewards stub disabled).
- [ ] Every list screen handles loading / empty / error.

---

## 12. Out of scope — DO NOT BUILD in Phase 1
These are Phase 2/3 per the PRD. Agents must not implement them (stub or omit):
- **Reward redemption / spending tokens** (Phase 2). Rewards UI stays a disabled "Coming soon" stub (D8).
- **Negotiation mechanism** (PRD §三) — counter-offers, negotiation threads, `negotiating` status, rate changes. (Phase 2)
- **Streak bonuses** (Phase 2).
- **Growth journey log** — timeline, photos, mood/energy tags, duration logging. (Phase 3)
- **Real authentication & invite flow** — Firebase Auth, parent-invites-kid, email/password. (Deferred)
- **Video attachments.**
- **Production Firestore security rules.** (Tracked as the D2 security TODO, not a feature.)

---

## 13. Open items to confirm before kickoff
*(I made the ⚙️ defaults in §2 to keep this unblocked — change any of these and I'll regenerate the affected tasks.)*
1. Keep **tab-based navigation**, or add `react-router-dom`? (D5)
2. Rewards: **disabled stub** vs **hidden entirely** in Phase 1? (D8)
3. Confirm **recurring completions** + **one-pending-per-activity** is the desired chore behavior. (D6)
4. Demo seed names/avatars (`Parent`, `Mia`, `Leo`) — fine, or use your own?
5. Do you want the Firestore **emulator** wired in for local dev, or point straight at a live Firebase project?
6. Should the activity assignment UI default to **"all kids"** when none selected, or force explicit selection?

---

*End of Phase 1 plan.*
