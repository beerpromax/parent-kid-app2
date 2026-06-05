# Phase 2 Development Plan — Family Coordination Webapp
*Multi-agent task spec. Builds directly on the Phase 1 codebase and contracts.*

> **Status:** Ready for distribution to a multi-agent build system.
> **Prereq:** Phase 1 is complete and merged (the `create → complete → submit → approve → credit` loop works, multi-kid, Firebase + local profiles).
> **Scope:** Phase 2 — the full **token system**: reward wishlist & catalog, reward redemption, full wallet + progress bar, the **negotiation mechanism**, and streak bonuses.
> **Persistence:** same as Phase 1 — Firebase (Firestore), **no Firebase Auth**, local profile selection.
> **Product source of truth:** `family_app_PRD_draft.md` (esp. §三 协商机制, §四 用户角色). **UI patterns / repo layout:** `PROJECT_GUIDE.md` + the Phase 1 plan.

---

## 0. How the orchestrator should use this document

1. **Build `WS0` (Contracts & Data-Layer Extensions) FIRST and completely.** It extends the Phase 1 types, adds new collections, and adds/extends repository functions. Freeze §5 before any parallel work.
2. After WS0, **WS1–WS5 run in parallel** per the DAG in §9. Screens talk to Firestore **only** through repository functions — never inline `firestore` calls in components (Phase 1 rule still holds).
3. **WS6 (Integration & Verification) runs last.**
4. Every task lists **Goal · Files · Functions/logic · UI components · Depends on · Acceptance criteria.**
5. **Reuse Phase 1 building blocks**: the repository pattern, `DataContext`/`ProfileContext`, and shared components (`TokenChip`, `CompletionStatusBadge`, `EmptyState`, `ActivityCard`). Extend them; don't fork them.

---

## 1. Scope

### 1.1 In scope (Phase 2)
- **Reward wishlist & catalog**: kids propose rewards; parent sets the token cost and activates them; parent can also create rewards directly; edit/archive.
- **Reward redemption + fulfillment**: kid spends tokens to redeem a reward; parent marks it fulfilled (or refunds). Celebration on redeem.
- **Full token wallet**: balance, **progress bar toward the next reward**, complete ledger (credits **and** debits) with filtering.
- **Negotiation mechanism (PRD §三)** — the centerpiece: a kid initiates a request to change an activity's token *value* or a reward's token *cost*; parent accepts / counter-offers / rejects; unlimited back-and-forth; new rate applies only to future records; pending records settle at the old (snapshot) rate.
- **Streak bonuses**: consecutive-day completion streaks with milestone bonus tokens. *(Rules proposed in §8.4 — confirm before build; lowest priority, can defer to "Phase 2.5".)*
- **In-app notification surfaces** (badges/inboxes) for: parent's negotiation queue, parent's redemption-fulfillment queue, kid's reward-proposal status, kid's active negotiations. (No push notifications.)

### 1.2 Out of scope — DO NOT BUILD (see §12)
Growth journey log (timeline, photos, mood tags) · real authentication / invite flows · video · push/email notifications · per-kid independent rates (negotiated rates are family-wide in v2 — see D3) · production Firestore security rules (still a tracked TODO).

---

## 2. What changes relative to Phase 1
| Phase 1 artifact | Phase 2 change |
|---|---|
| `Activity.status: 'active' \| 'archived'` (reserved `'negotiating'`) | `'negotiating'` is **now active** — set while a negotiation thread is open on that activity. |
| `LedgerEntry.reason: 'activity_approved'` (reserved `'reward_redeemed'`) | Adds `'reward_redeemed'`, `'reward_refunded'`, `'streak_bonus'`. `delta` may now be **negative** (redemptions). |
| Rewards "Coming soon" stub (D8 in Phase 1) | **Replaced** by the real reward catalog, redemption, and wallet progress bar. Remove the stub. |
| `Completion.tokenValueSnapshot` (rate captured at submission) | **No change needed** — this already implements PRD §3.5 ("pending records settle at the old rate"). Phase 2 negotiation only changes the *live* value; snapshots are untouched. |
| `approveCompletion` transaction | **Extended** to also compute the streak and award milestone bonuses (§8.4). |
| `Profile` | Adds streak fields (`currentStreak`, `longestStreak`, `lastStreakDate`). |

---

## 3. Architectural decisions & assumptions
*(⚙️ = reasonable default to remove ambiguity; override before kickoff via §13.)*

| # | Decision | Notes |
|---|----------|-------|
| D1 ⚙️ | **Redemption = deduct-at-request + parent fulfillment.** Kid redeems → tokens deducted immediately in a transaction (balance validated) → record `requested` → parent marks `fulfilled` (real-world reward granted) or `refunded` (tokens returned). | Prevents overspend/double-spend, keeps the parent's real-world fulfillment role, and mirrors the approval pattern the app already uses. Alternative ("instant, no parent step") is noted in §13. |
| D2 ⚙️ | **Kid-proposed rewards require parent activation.** Kid proposes (no cost) → `proposed` → parent sets `tokenCost` → `active` (redeemable). Parent may also create rewards directly as `active`. | Matches PRD §四 ("家长审阅孩子的奖励请求，设定代币成本"). |
| D3 ⚙️ | **Negotiated rates are family-wide** (one value per activity/reward, shared across kids) in v2. | PRD models a single value per item. Per-kid rates are a large schema change → deferred. Flagged in §13. |
| D4 | **Negotiation back-and-forth model:** there is always one *current offer* on the table, attributed to the party who made it (the proposer implicitly agrees to their own offer). The other party either **Accepts** (→ both agree → apply) or **Counters** (→ becomes the new current offer). Unlimited rounds. Either party can **Reject**; the initiating kid can **Cancel**. | Faithful, minimal encoding of PRD §3.3's "both click Agree → new rate". |
| D5 | **Parallel tracks (PRD §3.4):** a `negotiating` status **never** blocks completing/submitting/approving the item. It only blocks (a) starting a *second* negotiation on the same item, and (b) — per §3.1 — *starting* a negotiation while the item has a pending completion/redemption. | Approvals during negotiation use the submission snapshot rate. |
| D6 ⚙️ | **Negotiation initiation guard is item-level** (PRD §3.1 phrasing "该项目有待审批记录"): block if the item has **any** pending completion (activity) / pending redemption (reward). | Multi-kid nuance flagged in §13. |
| D7 ⚙️ | **Wallet "next reward" target** = the cheapest **active** reward available to that kid whose cost is **> current balance** (the nearest goal). If none, show the cheapest unaffordable reward, or "all rewards reachable!". | A kid-pinned goal is a §13 option. |
| D8 ⚙️ | **Streak** = consecutive **calendar days** (family-local timezone, default device tz) with ≥1 **approved** completion. Milestone bonuses (proposed: +3 at a 3-day streak, +7 at 7, +15 at 14, +30 at 30; non-repeating per milestone within a streak). Computed inside the approve transaction. | Rules genuinely undefined in PRD — **confirm §8.4 / §13** before building. Lowest priority. |
| D9 | All Phase 1 conventions still apply (repo-only data access, integer tokens, no negative balances, functional state, reuse `ui/` primitives, no HTML `<form>`, sonner toasts, confetti reuse). | See Phase 1 §4. |

---

## 4. Target file / folder additions
*New files for Phase 2. Existing Phase 1 files are extended in place where noted.*

```
src/
├─ lib/
│  ├─ types.ts                         # EXTEND (Reward, Redemption, Negotiation, Profile streak fields, ledger reasons)
│  ├─ paths.ts                         # EXTEND (rewards, redemptions, negotiations, offers subcol)
│  ├─ bootstrap.ts                     # EXTEND (seed 2–3 sample rewards)
│  └─ repos/
│     ├─ rewards.repo.ts               # NEW   (WS0)
│     ├─ redemptions.repo.ts           # NEW   (WS0)
│     ├─ negotiations.repo.ts          # NEW   (WS0)
│     └─ completions.repo.ts           # EXTEND (approve now does streak — WS0/WS5)
├─ app/
│  ├─ context/DataContext.tsx          # EXTEND (subscribe rewards/redemptions/negotiations)
│  ├─ screens/
│  │  ├─ parent/
│  │  │  ├─ RewardManager.tsx          # NEW   (WS1) catalog + proposal review + cost setting
│  │  │  ├─ FulfillmentInbox.tsx       # NEW   (WS2) mark fulfilled / refund
│  │  │  ├─ NegotiationInbox.tsx       # NEW   (WS4) accept / counter / reject
│  │  │  └─ ParentHome.tsx             # EXTEND nav: add Rewards / Fulfillment / Negotiations tabs + badges
│  │  └─ kid/
│  │     ├─ Wishlist.tsx               # NEW   (WS1) propose + browse rewards
│  │     ├─ RedeemDialog.tsx           # NEW   (WS2) confirm redemption
│  │     ├─ RedemptionHistory.tsx      # NEW   (WS2)
│  │     ├─ TokenWallet.tsx            # EXTEND (WS3) full wallet + progress bar (replaces lite)
│  │     ├─ NegotiationLauncher.tsx    # NEW   (WS4) start a negotiation from an activity/reward
│  │     ├─ MyNegotiations.tsx         # NEW   (WS4) kid's threads (counter/accept/cancel)
│  │     ├─ RewardsComingSoon.tsx      # REMOVE (stub replaced by Wishlist)
│  │     └─ KidHome.tsx                # EXTEND nav: Activities / Wallet / Wishlist / Negotiations + badges
│  └─ components/
│     ├─ RewardCard.tsx                # NEW   (WS1) shared presentational reward card
│     ├─ ProgressToReward.tsx          # NEW   (WS3) progress bar to next goal
│     ├─ NegotiationThreadView.tsx     # NEW   (WS4) offer-history (chat-like) + action bar
│     ├─ OfferBubble.tsx               # NEW   (WS4) single offer row
│     ├─ StreakBadge.tsx               # NEW   (WS5) flame + count
│     └─ NotificationBadge.tsx         # NEW   (WS0) small count pill for nav tabs
```

---

## 5. SHARED CONTRACTS — build first (WS0), freeze before parallel work

### 5.1 Type extensions — `src/lib/types.ts`

```ts
// --- Profile: add streak fields ---
export interface Profile {
  // ...existing Phase 1 fields...
  currentStreak?: number;    // consecutive days with ≥1 approved completion
  longestStreak?: number;
  lastStreakDate?: string;   // 'YYYY-MM-DD' in family-local tz
}

// --- Ledger: widen reasons; delta may be negative ---
export type LedgerReason =
  | 'activity_approved'
  | 'streak_bonus'
  | 'reward_redeemed'   // delta < 0
  | 'reward_refunded';  // delta > 0
export interface LedgerEntry {
  // ...existing...
  reason: LedgerReason;
  // delta may now be negative (redemptions)
  relatedRedemptionId?: string;
}

// --- Reward ---
export type RewardStatus = 'proposed' | 'active' | 'negotiating' | 'archived';
export interface Reward {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  tokenCost: number;            // 0 while 'proposed' until parent sets it
  forKidIds: string[];          // empty => all kids
  status: RewardStatus;
  proposedByProfileId: string;  // kid (proposal) or parent (direct create)
  createdAt: number;
  updatedAt: number;
}

// --- Redemption ---
export type RedemptionStatus = 'requested' | 'fulfilled' | 'refunded';
export interface RedemptionRecord {
  id: string;
  familyId: string;
  rewardId: string;
  rewardTitleSnapshot: string;
  tokenCostSnapshot: number;    // amount deducted at request
  kidId: string;
  status: RedemptionStatus;
  note?: string;
  requestedAt: number;
  resolvedAt?: number;
  resolvedByProfileId?: string;
}

// --- Negotiation ---
export type NegotiationTargetType = 'activity' | 'reward';
export type NegotiationStatus = 'open' | 'agreed' | 'rejected' | 'cancelled';
export interface NegotiationThread {
  id: string;
  familyId: string;
  targetType: NegotiationTargetType;
  targetId: string;
  targetTitleSnapshot: string;
  initiatedByProfileId: string;   // always a kid (PRD §3.1)
  status: NegotiationStatus;
  originalValue: number;          // value before negotiation (token value or cost)
  currentOfferValue: number;      // value currently on the table
  currentOfferByProfileId: string;// who made it (implicitly agrees to it)
  agreedValue?: number;           // set when status='agreed'
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
}
export type OfferKind = 'open' | 'counter' | 'accept' | 'reject' | 'cancel';
export interface NegotiationOffer {  // subcollection of a thread
  id: string;
  threadId: string;
  byProfileId: string;
  byRole: Role;
  value: number;                   // proposed value (for open/counter/accept echoes the agreed value)
  message?: string;
  kind: OfferKind;
  createdAt: number;
}
```

### 5.2 Firestore layout additions — `src/lib/paths.ts`
```
families/{familyId}/rewards/{rewardId}                 → Reward
families/{familyId}/redemptions/{redemptionId}         → RedemptionRecord
families/{familyId}/negotiations/{threadId}            → NegotiationThread
families/{familyId}/negotiations/{threadId}/offers/{offerId} → NegotiationOffer
```
Add path helpers (`rewardsCol`, `rewardDoc`, `redemptionsCol`, `negotiationsCol`, `negotiationDoc`, `offersCol`).

### 5.3 Repository API — the contract every screen codes against

```ts
// ---------- rewards.repo.ts ----------
subscribeRewards(familyId: string, cb: (r: Reward[]) => void): Unsubscribe; // excludes 'archived'
proposeReward(familyId: string, input: {
  title: string; description?: string; proposedByProfileId: string; forKidIds: string[];
}): Promise<string>; // status='proposed', tokenCost=0
createReward(familyId: string, input: {
  title: string; description?: string; tokenCost: number; forKidIds: string[]; createdByProfileId: string;
}): Promise<string>; // status='active'
setRewardCostAndActivate(familyId: string, id: string, tokenCost: number): Promise<void>; // 'proposed' → 'active'
rejectProposal(familyId: string, id: string): Promise<void>; // proposal → 'archived'
updateReward(familyId: string, id: string,
  patch: Partial<Pick<Reward,'title'|'description'|'tokenCost'|'forKidIds'>>): Promise<void>;
archiveReward(familyId: string, id: string): Promise<void>;

// ---------- redemptions.repo.ts ----------
subscribeRedemptions(familyId: string, opts: { status?: RedemptionStatus; kidId?: string },
  cb: (r: RedemptionRecord[]) => void): Unsubscribe;
redeemReward(familyId: string, input: { rewardId: string; kidId: string; note?: string }): Promise<string>; // TRANSACTION §5.4-A
fulfillRedemption(familyId: string, id: string, reviewerId: string): Promise<void>;                         // §5.4-B
refundRedemption(familyId: string, id: string, reviewerId: string): Promise<void>;                          // TRANSACTION §5.4-C

// ---------- negotiations.repo.ts ----------
subscribeNegotiations(familyId: string, opts: { status?: NegotiationStatus; targetType?: NegotiationTargetType },
  cb: (t: NegotiationThread[]) => void): Unsubscribe;
subscribeOffers(familyId: string, threadId: string, cb: (o: NegotiationOffer[]) => void): Unsubscribe; // chronological
canInitiateNegotiation(familyId: string, targetType: NegotiationTargetType, targetId: string): Promise<boolean>; // §8.1
initiateNegotiation(familyId: string, input: {
  targetType: NegotiationTargetType; targetId: string; kidId: string; proposedValue: number; message?: string;
}): Promise<string>;                                                                                   // TRANSACTION §5.4-D
counterOffer(familyId: string, threadId: string, input: { byProfileId: string; value: number; message?: string }): Promise<void>; // §5.4-E
acceptCurrentOffer(familyId: string, threadId: string, byProfileId: string): Promise<void>;            // TRANSACTION §5.4-F
rejectNegotiation(familyId: string, threadId: string, byProfileId: string): Promise<void>;             // TRANSACTION §5.4-G
cancelNegotiation(familyId: string, threadId: string, kidId: string): Promise<void>;                   // §5.4-G (initiator only)

// ---------- completions.repo.ts (EXTEND) ----------
// approveCompletion(...) — unchanged signature, EXTENDED logic: now also runs the streak update (§8.4)
```

### 5.4 Transaction & logic specs (must be exact)

**A. `redeemReward` (transaction)**
1. Read reward → must be `status === 'active'` and available to the kid (`forKidIds` empty or includes kid). Else abort with typed error.
2. Read kid profile → require `tokenBalance >= reward.tokenCost`. Else abort `INSUFFICIENT_TOKENS`.
3. `newBalance = tokenBalance - reward.tokenCost`.
4. Create redemption: `status='requested'`, `tokenCostSnapshot=reward.tokenCost`, `rewardTitleSnapshot`, `requestedAt=now`.
5. Update kid `tokenBalance = newBalance`.
6. Ledger entry: `delta = -tokenCost`, `reason='reward_redeemed'`, `relatedRedemptionId`, `balanceAfter=newBalance`.

**B. `fulfillRedemption`** — guard `status==='requested'` (else no-op). Set `status='fulfilled'`, `resolvedAt`, `resolvedByProfileId`. No balance change.

**C. `refundRedemption` (transaction)** — guard `status==='requested'` (else no-op). Read kid, `newBalance = balance + tokenCostSnapshot`. Set redemption `status='refunded'`, `resolvedAt`, `resolvedByProfileId`. Update balance. Ledger: `delta=+tokenCostSnapshot`, `reason='reward_refunded'`, `balanceAfter=newBalance`.

**D. `initiateNegotiation` (transaction)**
1. Re-check `canInitiateNegotiation` invariants inside the txn (§8.1): target exists, not already `negotiating`, and no pending completion/redemption on it. Abort otherwise.
2. Read target's live value (`activity.tokenValue` or `reward.tokenCost`) → `originalValue`.
3. Set target `status='negotiating'`.
4. Create thread: `status='open'`, `originalValue`, `currentOfferValue=proposedValue`, `currentOfferByProfileId=kidId`, `initiatedByProfileId=kidId`.
5. Create first offer: `kind='open'`, `byProfileId=kidId`, `value=proposedValue`, `message?`.

**E. `counterOffer`** — guard thread `status==='open'`. The caller must **not** be `currentOfferByProfileId` (you can't counter your own standing offer). Update thread `currentOfferValue=value`, `currentOfferByProfileId=byProfileId`, `updatedAt`. Append offer `kind='counter'`. (No target change yet.)

**F. `acceptCurrentOffer` (transaction)** — guard thread `status==='open'` **and** caller is **not** `currentOfferByProfileId` (the standing offer's author already agrees; the *other* party accepting means both agree). 
1. `agreed = thread.currentOfferValue`.
2. Apply to target: `activity.tokenValue = agreed` **or** `reward.tokenCost = agreed`; set target `status` back to `'active'`.
3. Thread: `status='agreed'`, `agreedValue=agreed`, `closedAt=now`.
4. Append offer `kind='accept'`, `value=agreed`, `byProfileId=caller`.
> The new value affects **future** records only. Pending completions keep their `tokenValueSnapshot` (PRD §3.5) — no retroactive change.

**G. `rejectNegotiation` / `cancelNegotiation` (transaction)** — guard `status==='open'`. (`cancel` additionally requires caller `=== initiatedByProfileId`.) Restore target `status='active'` (value unchanged, stays at `originalValue`). Thread `status='rejected'|'cancelled'`, `closedAt`. Append offer `kind='reject'|'cancel'`.

**H. Extended `approveCompletion`** — see streak spec §8.4. The existing credit logic is unchanged; streak update is added inside the same transaction.

---

## 6. Workstream summary

| WS | Title | Owner | Depends on | Parallel? |
|----|-------|-------|------------|-----------|
| **WS0** | Contracts & data-layer extensions | Agent A (blocking) | Phase 1 | No (first) |
| **WS1** | Reward catalog & wishlist | Agent B | WS0 | Yes |
| **WS2** | Redemption & fulfillment | Agent C | WS0, WS1 (rewards exist) | Yes* |
| **WS3** | Full wallet + progress bar | Agent D | WS0, WS1 | Yes* |
| **WS4** | Negotiation engine | Agent E | WS0 | Yes |
| **WS5** | Streak system | Agent F | WS0 | Yes |
| **WS6** | Integration & verification | Agent A/G | WS1–WS5 | No (last) |

\* WS2/WS3 need the `Reward` type + `subscribeRewards` from WS0, and benefit from WS1's catalog existing for testing. They can start against WS0 contracts immediately using seeded rewards.

---

## 7. Detailed task breakdown

### WS0 — Contracts & data-layer extensions *(blocking)*

- **T0.1 — Extend types & paths.** Add §5.1 types and §5.2 path helpers. Update `LedgerEntry`. **Acceptance:** compiles; no Phase 1 type breaks.
- **T0.2 — `rewards.repo.ts`.** Implement all reward signatures (§5.3). `subscribeRewards` excludes archived; sorts by status then createdAt. **Acceptance:** propose → setCost → active lifecycle works live.
- **T0.3 — `redemptions.repo.ts`.** Implement redeem/fulfill/refund per §5.4-A/B/C. Typed `INSUFFICIENT_TOKENS` error. **Acceptance:** balance never goes negative; refund restores exact amount; idempotent guards hold.
- **T0.4 — `negotiations.repo.ts`.** Implement all signatures + transactions §5.4-D/E/F/G + `canInitiateNegotiation` §8.1. **Acceptance:** the full state machine (§8.2) behaves; locks set/clear correctly; applying a rate updates the target and frees the lock atomically.
- **T0.5 — Extend `approveCompletion` with streak.** Per §8.4, inside the existing transaction. **Acceptance:** streak increments on a new qualifying day, resets after a gap, milestone bonus writes a `streak_bonus` ledger entry exactly once.
- **T0.6 — Extend `DataContext` + seed.** Subscribe to rewards, redemptions (scoped), negotiations; expose live arrays + loading flags; tear down on profile switch. Seed 2–3 sample rewards in `bootstrap.ts`. Add `NotificationBadge`. **Acceptance:** all new collections stream into context; switching profiles re-scopes.

### WS1 — Reward catalog & wishlist
- **T1.1 — Kid Wishlist (`Wishlist.tsx`).** Browse rewards available to the kid (`RewardCard`: title, cost via `TokenChip`, affordability state). "Propose a reward" → `proposeReward` (title/description; no cost). Show the kid their proposals' status (`proposed`/`active`/rejected). **UI:** `card`, `dialog`, `input`, `textarea`, `button`, `badge`, `sonner`. **Acceptance:** proposal appears in parent review live; activated rewards become redeemable in the wishlist.
- **T1.2 — Parent RewardManager (`RewardManager.tsx`).** Three sections: **Proposals to review** (set cost → `setRewardCostAndActivate`, or `rejectProposal`), **Active catalog** (edit/archive, assign `forKidIds`), **Create reward** (direct `createReward`). **UI:** `card`, `dialog`, `input`, `select`/`checkbox`, `alert-dialog`, `button`. **Acceptance:** setting a cost activates a reward; edits/archives reflect live for kids; validation requires `tokenCost ≥ 1` to activate.
- **T1.3 — Shared `RewardCard.tsx`.** Props-only presentational card (title, description, cost, status badge, optional action slot). Reused by WS1/WS3. **Acceptance:** renders all reward states without data fetching.

### WS2 — Redemption & fulfillment
- **T2.1 — Kid RedeemDialog (`RedeemDialog.tsx`).** From a redeemable `RewardCard`, confirm → `redeemReward`. Disable while in flight. On success: confetti + toast ("Redeemed! Waiting for {parent}"). Handle `INSUFFICIENT_TOKENS` gracefully. **Acceptance:** balance drops by exactly the cost; a `requested` redemption appears in the parent inbox; rapid double-click can't double-spend.
- **T2.2 — Kid RedemptionHistory (`RedemptionHistory.tsx`).** List the kid's redemptions with status (`requested`/`fulfilled`/`refunded`) and time. **Acceptance:** reflects status changes live.
- **T2.3 — Parent FulfillmentInbox (`FulfillmentInbox.tsx`).** List `requested` redemptions across kids (kid name, reward, cost, time, note). Actions: **Mark fulfilled** (`fulfillRedemption`) / **Refund** (`refundRedemption`, confirm). **UI:** `card`, `avatar`, `badge`, `button`, `alert-dialog`. **Acceptance:** fulfill closes the item (no balance change); refund returns tokens and writes a `reward_refunded` ledger entry; idempotent.

### WS3 — Full wallet + progress bar
- **T3.1 — Upgrade `TokenWallet.tsx`.** Replace the lite version: prominent balance, **`ProgressToReward`** bar to the next goal (D7), full ledger (credits + debits, color-coded by sign, reason label, time) with an optional filter (all / earned / spent). Remove the Phase 1 rewards stub. **UI:** `card`, `progress`, `scroll-area`, `tabs`/`toggle-group`, `separator`, `TokenChip`. **Acceptance:** balance == dashboard == ledger running total; debits show negative; progress bar matches the chosen next reward.
- **T3.2 — `ProgressToReward.tsx`.** Given balance + the kid's active rewards, compute the next goal per D7; render `balance / cost` with remaining count. Handle "no rewards" and "all reachable". **Acceptance:** updates live as balance and catalog change.

### WS4 — Negotiation engine *(the centerpiece)*
- **T4.1 — Kid NegotiationLauncher (`NegotiationLauncher.tsx`).** Entry points on an activity (negotiate its **value**) and on a reward (negotiate its **cost**). Pre-check `canInitiateNegotiation`; if blocked, show why (pending record / already negotiating). Dialog: show current value, enter proposed value (integer ≥1) + optional message → `initiateNegotiation`. **Acceptance:** initiating sets the item to `negotiating` (visible to both sides) and opens a thread; blocked cases are clearly explained.
- **T4.2 — Shared thread UI (`NegotiationThreadView.tsx` + `OfferBubble.tsx`).** Chat-like offer history from `subscribeOffers` (left/right by role, value + message + time, kind label). Action bar adapts to the viewer and whose offer is standing: if it's *your* standing offer → "Waiting for the other side" + (kid only) Cancel; if it's the *other* party's offer → **Accept** / **Counter** (+ value input) / **Reject**. **UI:** `card`, `scroll-area`, `input`, `button`, `badge`. **Acceptance:** the action set is always correct for the current state; you can never accept/counter your own standing offer.
- **T4.3 — Kid MyNegotiations (`MyNegotiations.tsx`).** List the kid's threads (open first, then closed) → open `NegotiationThreadView`. Badge count of threads awaiting the kid's move. **Acceptance:** counts and statuses update live.
- **T4.4 — Parent NegotiationInbox (`NegotiationInbox.tsx`).** List `open` threads needing the parent → `NegotiationThreadView` with Accept/Counter/Reject. Nav badge with count. **Acceptance:** accepting applies the new rate to the target and unlocks it; rejecting unlocks with no change; everything reflects on the kid side live.
- **T4.5 — Status surfacing.** Show a "Negotiating" badge on the affected activity/reward cards (WS1/WS4/Activity screens) while a thread is open. **Acceptance:** badge appears on lock and clears on agree/reject/cancel; the item is still completable/redeemable during negotiation (D5) at the snapshot/old rate.

### WS5 — Streak system *(lowest priority; confirm §8.4 first)*
- **T5.1 — Streak compute** is delivered in T0.5 (inside `approveCompletion`). This task is the **display + verification**.
- **T5.2 — `StreakBadge.tsx`** on KidHome + wallet (flame + `currentStreak`, tooltip with `longestStreak`). **Acceptance:** reflects the profile streak fields live; milestone bonus visible in the ledger as `streak_bonus`.

### WS6 — Integration & verification *(last)*
| Task | Goal | Acceptance |
|------|------|------------|
| T6.1 | Negotiation ↔ approval independence (PRD §3.4/3.5) | During an open negotiation, a completion submitted *before* agreement still approves at the **old snapshot** rate; new submissions after agreement use the **new** rate. |
| T6.2 | Lock correctness | Can't start a 2nd negotiation on a `negotiating` item; can't start one while a pending completion/redemption exists; locks always clear on close. |
| T6.3 | Token integrity | No overspend, no negative balance, no double-spend (rapid redeem in two tabs). Refund returns exactly the cost. Approve still can't double-credit. |
| T6.4 | Wallet consistency | balance == dashboard == ledger running total at all times, including after redemptions and refunds. |
| T6.5 | Streak edge cases | Same-day second approval doesn't bump the streak; a missed day resets to 1; milestone bonus fires once per milestone. |
| T6.6 | Manual run | Execute §11 end-to-end with 2 kids. Update `README.md` (Phase 2 scope, what's stubbed/deferred). |

---

## 8. Logic rules reference (single source of truth)

### 8.1 Negotiation initiation guard (`canInitiateNegotiation`)
Allowed **iff** all hold: target exists and is `active` (not already `negotiating`/`archived`); and the target has **no pending completion** (activity) / **no pending redemption** (reward) (D6, PRD §3.1). Only kids initiate (PRD §3.1).

### 8.2 Negotiation state machine
```
(kid) initiateNegotiation
        │  target.status = negotiating ; thread.status = open ; current offer = kid's value
        ▼
   open ──(other party) acceptCurrentOffer──▶ agreed   [apply value → target.status=active]
     │  ──(other party) counterOffer──▶ open (new current offer, roles flip)
     │  ──(either) rejectNegotiation──▶ rejected  [target.status=active, value unchanged]
     └──(initiator) cancelNegotiation──▶ cancelled [target.status=active, value unchanged]
```
- The standing offer's author implicitly agrees; the **other** party Accepting = both agree = apply (PRD "both click Agree").
- Unlimited rounds (PRD §3.3).

### 8.3 Rate application & history (PRD §3.4 / §3.5)
- New rate applies to **future** submissions/redemptions only.
- Completions submitted before agreement keep `tokenValueSnapshot` and settle at the **old** rate on approval — even if approval happens after agreement.
- Completing/submitting/approving is **never blocked** by `negotiating` status.

### 8.4 Streak rules ⚙️ *(PROPOSED — confirm in §13)*
- A "streak day" = a family-local calendar day with ≥1 **approved** completion for that kid.
- Inside `approveCompletion`, after crediting: `today = familyLocalDate(now)`.
  - if `lastStreakDate === today` → no change (already counted today).
  - else if `lastStreakDate === yesterday` → `currentStreak += 1`.
  - else → `currentStreak = 1`.
  - `lastStreakDate = today`; `longestStreak = max(longestStreak, currentStreak)`.
- **Milestone bonus:** when `currentStreak` reaches a milestone in `{3, 7, 14, 30}`, credit a bonus (`{+3, +7, +15, +30}` respectively) once: add to balance + `streak_bonus` ledger entry, in the same transaction.
- **Timezone:** family-local; default device tz (configurable later). Open questions: grace days? streak per-kid (yes) ? bonus repeats after 30? — see §13.

### 8.5 Carried-over Phase 1 rules
One pending completion per (kid, activity); recurring completions; rate snapshot at submission; idempotent approval; integer tokens; archive ≠ delete; assignment empty ⇒ all kids.

---

## 9. Sequencing / parallelization (DAG)
```
        ┌──────────── WS0 (blocking) ────────────┐
        │ types/paths → repos(rewards,redemptions, │
        │ negotiations) → approve+streak → context │
        └───────────────┬─────────────────────────┘
                        │ (contracts frozen)
     ┌──────────┬───────┼─────────┬──────────┐
     ▼          ▼       ▼          ▼          ▼
    WS1 ─────▶ WS2     WS4        WS5        (WS1→)WS3
    (rewards)  (redeem)(negotiate)(streak)   (wallet)
     └──────────┴───────┴────┬─────┴──────────┘
                             ▼
                            WS6
```
- **Critical path:** WS0 → WS4 (negotiation is the largest/riskiest) → WS6.
- WS2 and WS3 depend on the reward *type/repo* (WS0) and are easier to test once WS1's catalog exists; they may start against seeded rewards.

---

## 10. Integration milestones / demo script
"Phase 2 complete" when this runs end-to-end on a fresh machine:
1. As **Kid Mia**, propose a reward "Movie night". As **Parent**, set its cost to 30 and activate it.
2. Mia earns enough tokens (approve a few activities) → **redeem** "Movie night" → balance drops 30, confetti, item lands in the parent **FulfillmentInbox**.
3. Parent **marks it fulfilled**; later test **refund** on another redemption → tokens return, ledger shows `reward_refunded`.
4. Mia opens a **negotiation** on "Read 20 min = 5" proposing 8. Parent **counters** 6. Mia **accepts** → activity value becomes 6 going forward.
5. Before that agreement, Mia had a pending "Read 20 min" completion → parent approves it → it still credits **5** (old snapshot), proving §3.5.
6. Confirm the item was **completable during** the negotiation (D5), and that a 2nd negotiation couldn't start while it was open.
7. **Wallet** shows balance, a progress bar to the next reward, and a full credits/debits ledger.
8. Approve completions on consecutive days for Mia → **streak** increments; hitting day 3 grants a `streak_bonus`.

---

## 11. Manual verification checklist (WS6)
- [ ] Kid can propose a reward; parent can set cost & activate, or reject; direct parent-created rewards work.
- [ ] Redemption deducts exactly the cost; never allows negative balance; no double-spend across two tabs.
- [ ] Fulfill closes with no balance change; refund returns exact tokens + writes `reward_refunded`.
- [ ] Negotiation: only kids initiate; blocked while a pending completion/redemption exists or item already negotiating.
- [ ] Accept/Counter/Reject/Cancel all transition correctly; you can't act on your own standing offer.
- [ ] On agreement, the target's live value changes and the lock clears; on reject/cancel, value unchanged + lock clears.
- [ ] Pending completion submitted pre-agreement still settles at the old snapshot rate.
- [ ] Item remains completable/redeemable during negotiation.
- [ ] Wallet: balance == dashboard == ledger total; debits negative; progress bar correct.
- [ ] Streak increments once/day, resets after a gap, milestone bonus fires once.
- [ ] All new list screens handle loading / empty / error; nav badges show correct counts.
- [ ] Phase 1 reward "Coming soon" stub is removed.

---

## 12. Out of scope — DO NOT BUILD in Phase 2
- **Growth journey log** — timeline, photos, mood/energy tags, duration logging (Phase 3).
- **Real authentication & invite flow** (deferred).
- **Push / email notifications** — in-app badges only.
- **Per-kid independent rates** — negotiated rates are family-wide in v2 (D3).
- **Video.**
- **Production Firestore security rules** — tracked TODO (the no-auth open-rules limitation from Phase 1 persists).

---

## 13. Open items to confirm before kickoff
*(⚙️ defaults are in place so this is unblocked — change any and I'll patch the affected tasks.)*
1. **Redemption model (D1):** deduct-at-request + parent fulfill/refund *(default)* — or instant redeem with no parent step — or request → parent approves → then deduct?
2. **Kid-proposed rewards (D2):** require parent activation *(default)* — or let kids self-add rewards with a cost they set?
3. **Negotiated rates with multiple kids (D3/D6):** keep **family-wide** shared rates *(default)*, or do you eventually want per-kid rates / restrict negotiation to single-kid families?
4. **Streak rules (D8/§8.4):** confirm definition, milestones `{3,7,14,30}` → bonuses `{+3,+7,+15,+30}`, family-local timezone, no grace days, bonus non-repeating. Or defer streaks to "Phase 2.5"?
5. **Wallet next-reward target (D7):** auto "cheapest just-out-of-reach" *(default)* — or let the kid pin a goal reward?
6. **Negotiation value bounds:** any guardrails (e.g., min 1 token, max % change, round limit)? Default: integer ≥1, unlimited rounds (PRD).

---

*End of Phase 2 plan.*
