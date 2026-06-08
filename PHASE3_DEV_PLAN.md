# Phase 3 Development Plan — Family Coordination Webapp
*Multi-agent task spec. Builds on the Phase 1 + Phase 2 codebase and contracts.*

> **Status:** Ready for distribution to a multi-agent build system.
> **Prereq:** Phases 1 & 2 complete and merged (full token loop, rewards/redemption, wallet, negotiation, streaks).
> **Scope:** Phase 3 — the **Growth Journey Log** (PRD §二 逻辑二, §五): a per-kid timeline of activities with duration, participants, mood/energy tags, notes, and **photo attachments**.
> **Persistence:** Firestore (as before) **plus Firebase Storage** (new, for photos). Still **no Firebase Auth**, local profile selection.
> **Product source of truth:** `family_app_PRD_draft.md` (§二 逻辑二, §五 data structure). **UI patterns / layout:** `PROJECT_GUIDE.md` + the Phase 1/2 plans.

---

## ⚠️ Read first — child-photo privacy (hard pre-deploy blocker)
This phase stores **photographs of children** in Firebase Storage. The app still runs with **no authentication and open/test security rules** (carried from Phase 1). That combination is acceptable for **local validation only**.

**Before this build is exposed to anyone outside the developer's own machine:** real authentication + locked-down Firestore **and Storage** security rules are **mandatory, not optional**. Until then: do not deploy publicly, do not upload real photos of real children, use placeholder/stock images for testing. This is tracked as a blocking TODO (§12), and the upload pipeline strips EXIF metadata (including GPS) as a baseline safeguard (§5.4-A).

---

## 0. How the orchestrator should use this document
1. **Build `WS0` (Contracts & Storage Infra) FIRST and completely** — it adds the Storage setup, the upload pipeline utility, the growth-log types/paths/repo, and the context wiring. Freeze §5 before parallel work.
2. After WS0, **WS1 and WS3 run in parallel**; **WS2 depends on WS3**, **WS4 depends on WS2**, **WS5 depends on WS1** (see §9).
3. **WS6 (Integration & Verification) runs last.**
4. Every task lists **Goal · Files · Functions/logic · UI components · Depends on · Acceptance criteria.**
5. **Reuse existing building blocks**: the repo pattern, `DataContext`/`ProfileContext`, `EmptyState`, and the scaffold's `ImageWithFallback.tsx`. The growth log has **no token logic** — keep it fully decoupled from wallet/negotiation.

---

## 1. Scope

### 1.1 In scope (Phase 3)
- **Growth log data model** (per-kid entries) + Firestore collection.
- **Firebase Storage** setup + a **client-side photo upload pipeline** (validate → resize/compress → strip EXIF → thumbnail → upload → store refs).
- **Timeline view** — chronological (newest first), grouped by date, per kid; parent can switch between kids, a kid sees their own.
- **Entry composer** — create/edit an entry: date, activity content (free text), optional duration, **participants**, **mood + energy tags**, short note, **photos**.
- **Photo gallery + lightbox** within an entry; add/remove photos.
- **Completion → log bridge** — an opt-in "Add to growth log" affordance from the Phase 2 approval flow that pre-fills an entry from the approved completion.
- **Light polish** — filter by date range / mood, empty & loading states, a small mood-summary chip.

### 1.2 Out of scope — DO NOT BUILD (see §12)
Video attachments (PRD defers) · real auth / invite flow · push/email notifications · production security rules (tracked blocker) · token/reward interactions tied to logging · AI auto-captioning · PDF/keepsake export (possible Phase 4) · social sharing.

---

## 2. What changes relative to Phases 1 & 2
| Existing artifact | Phase 3 change |
|---|---|
| Firestore-only persistence | **Adds Firebase Storage** for photos. New `lib/storage.ts` upload pipeline. |
| `lib/types.ts` | Adds `GrowthLogEntry`, `PhotoRef`, `MoodTag`, `EnergyTag`. No changes to token types. |
| `DataContext` | Adds growth-log subscriptions (scoped to the viewed kid). |
| Phase 2 approval UI (`ApprovalInbox`) | **Optional** extension: after approve, offer "Add to growth log" (pre-fill). Non-blocking, opt-in (D2). |
| Token system (wallet, negotiation, streaks) | **Untouched.** Growth log is a separate, decoupled feature. |
| Navigation (`ParentHome`/`KidHome`) | Adds a **Journey / Growth Log** tab on both sides. |

---

## 3. Architectural decisions & assumptions
*(⚙️ = reasonable default to remove ambiguity; override via §13.)*

| # | Decision | Notes |
|---|----------|-------|
| D1 ⚙️ | **Photos live in Firebase Storage**, not as base64 in Firestore. | Firestore's ~1MB doc limit makes inline images infeasible; Storage is the standard pairing. |
| D2 ⚙️ | **Hybrid creation: manual-first + opt-in bridge.** Entries are primarily created/edited by hand. After a parent approves a completion, an **optional** "Add to growth log" prompt pre-fills a draft (date, activity content, duration, kid). **No automatic, silent entry creation.** | Keeps the log intentional and avoids coupling the approval transaction. PRD's "为每个孩子生成成长记录" is satisfied via the pre-fill without forcing auto-generation. |
| D3 ⚙️ | **Both parents and kids can create/edit entries** for any kid in the family; the log is **per-kid**. `createdByProfileId` is tracked. | Matches the PRD's "平等伙伴" ethos. Restrict to parent-only if preferred (§13). |
| D4 ⚙️ | **Soft delete (trash), not hard delete**, for entries — consistent with the Phase 1/2 `archive ≠ delete` convention. Individual **photos can be removed** from an entry (Storage object deleted). | Protects against accidental loss of a keepsake. A "Trash" view with restore is optional polish. |
| D5 ⚙️ | **Client-side image processing with no heavy dependency** — use a Canvas-based resize/compress util (max edge 1600px, JPEG quality ~0.82) + a ~320px thumbnail. EXIF (incl. GPS) is dropped by the canvas re-encode. | Avoids adding a large lib; `browser-image-compression` is an allowed alternative if the orchestrator prefers. |
| D6 ⚙️ | **Mood + energy are fixed enums** (emoji-mapped), single-select each, optional per entry. Proposed sets in §8.2. | PRD calls them "心情/能量标签（趣味评分）". Confirm the exact set (§13). |
| D7 ⚙️ | **Participants** = multi-select of family profiles **plus** free-text extras (e.g., "Grandma"). | Covers PRD's "谁和谁一起". |
| D8 ⚙️ | **Entry `date` is user-set** (defaults to today, editable) and drives timeline ordering; `createdAt` is separate. | Lets a kid log yesterday's hike. |
| D9 | All prior conventions hold (repo-only data access, functional state, reuse `ui/` primitives, no HTML `<form>`, sonner toasts, loading/empty/error on every list). | Phase 1 §4. |

---

## 4. Target file / folder additions
```
src/
├─ lib/
│  ├─ firebase.ts                      # EXTEND: export Storage (getStorage)
│  ├─ types.ts                         # EXTEND: GrowthLogEntry, PhotoRef, MoodTag, EnergyTag
│  ├─ paths.ts                         # EXTEND: growth log collection + storage path helper
│  ├─ storage.ts                       # NEW (WS0): upload pipeline (compress/thumbnail/EXIF-strip/upload/delete)
│  ├─ images.ts                        # NEW (WS0): canvas resize/compress/thumbnail helpers
│  ├─ datetime.ts                      # NEW (WS0): family-local date + timeline grouping helpers
│  ├─ bootstrap.ts                     # EXTEND: seed 1–2 sample growth entries (placeholder images)
│  └─ repos/
│     └─ growthlog.repo.ts             # NEW (WS0)
├─ app/
│  ├─ context/DataContext.tsx          # EXTEND: subscribe growth log (scoped to viewed kid)
│  ├─ screens/
│  │  ├─ parent/
│  │  │  ├─ GrowthLog.tsx              # NEW (WS1): parent view w/ kid switcher
│  │  │  ├─ ParentHome.tsx             # EXTEND: add "Journey" tab
│  │  │  └─ ApprovalInbox.tsx          # EXTEND (WS4): "Add to growth log" affordance
│  │  └─ kid/
│  │     ├─ MyJourney.tsx              # NEW (WS1): kid's own timeline
│  │     └─ KidHome.tsx                # EXTEND: add "Journey" tab
│  └─ components/
│     ├─ Timeline.tsx                  # NEW (WS1): date-grouped timeline container
│     ├─ GrowthEntryCard.tsx           # NEW (WS1): one entry (mood, participants, note, photo strip)
│     ├─ EntryComposerDialog.tsx       # NEW (WS2): create/edit entry
│     ├─ MoodEnergyPicker.tsx          # NEW (WS2): emoji single-selects
│     ├─ ParticipantPicker.tsx         # NEW (WS2): profiles + free-text
│     ├─ PhotoUploader.tsx             # NEW (WS3): drag/drop + progress + previews
│     ├─ PhotoGallery.tsx              # NEW (WS3): thumbnails in an entry
│     ├─ PhotoLightbox.tsx             # NEW (WS3): full-size viewer
│     └─ MoodSummaryChip.tsx           # NEW (WS5): recent-mood glance
```

---

## 5. SHARED CONTRACTS — build first (WS0), freeze before parallel work

### 5.1 Type additions — `src/lib/types.ts`
```ts
export type MoodTag = 'joyful' | 'happy' | 'calm' | 'meh' | 'tired' | 'frustrated' | 'sad';
export type EnergyTag = 'low' | 'medium' | 'high';

export interface PhotoRef {
  id: string;
  storagePath: string;     // full path in Storage (for deletion)
  downloadURL: string;     // cached display URL
  thumbnailURL?: string;   // ~320px version
  width?: number;
  height?: number;
  sizeBytes?: number;
  uploadedAt: number;
}

export type GrowthEntryStatus = 'active' | 'trashed';
export interface GrowthLogEntry {
  id: string;
  familyId: string;
  kidId: string;                  // whose log
  date: string;                   // 'YYYY-MM-DD' family-local (D8) — drives ordering
  title?: string;
  activityContent: string;        // PRD "活动内容" — free text of what happened
  durationMinutes?: number;
  participantProfileIds: string[];// family members involved
  participantNames?: string[];    // free-text extras (e.g., "Grandma")
  moodTag?: MoodTag;
  energyTag?: EnergyTag;
  note?: string;                  // PRD "短文字备注"
  photos: PhotoRef[];
  // optional linkage to the activity system (set when created via the bridge, D2)
  linkedCompletionId?: string;
  linkedActivityId?: string;
  status: GrowthEntryStatus;
  createdByProfileId: string;
  createdAt: number;
  updatedAt: number;
}
```

### 5.2 Firestore + Storage layout — `src/lib/paths.ts`
```
Firestore:
  families/{familyId}/growthLog/{entryId}          → GrowthLogEntry

Storage:
  families/{familyId}/growth/{kidId}/{entryId}/{photoId}.jpg          (full)
  families/{familyId}/growth/{kidId}/{entryId}/{photoId}_thumb.jpg    (thumbnail)
```
Add helpers: `growthLogCol(familyId)`, `growthEntryDoc(familyId, id)`, `photoStoragePath(familyId, kidId, entryId, photoId, variant)`.

### 5.3 Repository & utility API

```ts
// ---------- growthlog.repo.ts ----------
subscribeGrowthLog(familyId: string, opts: { kidId: string; from?: string; to?: string },
  cb: (e: GrowthLogEntry[]) => void): Unsubscribe; // status='active', ordered by date desc then createdAt desc
createEntry(familyId: string, input: {
  kidId: string; date: string; activityContent: string; createdByProfileId: string;
  title?: string; durationMinutes?: number; participantProfileIds?: string[];
  participantNames?: string[]; moodTag?: MoodTag; energyTag?: EnergyTag; note?: string;
  photos?: PhotoRef[]; linkedCompletionId?: string; linkedActivityId?: string;
}): Promise<string>;
updateEntry(familyId: string, id: string, patch: Partial<Omit<GrowthLogEntry,
  'id'|'familyId'|'kidId'|'createdByProfileId'|'createdAt'>>): Promise<void>;
trashEntry(familyId: string, id: string): Promise<void>;        // status='trashed' (D4)
restoreEntry(familyId: string, id: string): Promise<void>;      // status='active'
addPhotoToEntry(familyId: string, id: string, photo: PhotoRef): Promise<void>;    // arrayUnion
removePhotoFromEntry(familyId: string, id: string, photoId: string): Promise<void>; // arrayRemove + Storage delete

// ---------- storage.ts ----------
uploadEntryPhoto(familyId: string, kidId: string, entryId: string, file: File,
  onProgress?: (pct: number) => void): Promise<PhotoRef>; // PIPELINE §5.4-A
deleteEntryPhoto(photo: PhotoRef): Promise<void>;          // deletes full + thumb objects

// ---------- images.ts ----------
resizeAndCompress(file: File, maxEdge: number, quality: number): Promise<Blob>; // canvas, drops EXIF
makeThumbnail(file: File, maxEdge: number): Promise<Blob>;

// ---------- datetime.ts ----------
familyLocalDate(ts?: number): string;          // 'YYYY-MM-DD'
groupEntriesByDate(entries: GrowthLogEntry[]): { date: string; label: string; entries: GrowthLogEntry[] }[];
```

### 5.4 Pipeline & logic specs (must be exact)

**A. `uploadEntryPhoto` pipeline**
1. **Validate:** MIME in `{image/jpeg, image/png, image/webp, image/heic}`; reject otherwise. Reject pre-compress size > 15MB. (Cap photos per entry at, e.g., 8 — enforced in `PhotoUploader`.)
2. **Process:** `resizeAndCompress(file, 1600, 0.82)` → full blob; `makeThumbnail(file, 320)` → thumb blob. Re-encoding via canvas **drops all EXIF/GPS** (privacy).
3. **Upload:** put full + thumb to the Storage paths (§5.2) with `contentType: image/jpeg`; report progress.
4. **Resolve URLs:** get `downloadURL` for both.
5. **Return** a `PhotoRef` (`id`, `storagePath`, `downloadURL`, `thumbnailURL`, dims, sizeBytes, `uploadedAt`).
6. **On failure:** delete any objects already written (no orphans); surface a typed error.

**B. `removePhotoFromEntry` / `deleteEntryPhoto`** — delete the full + thumbnail Storage objects, then `arrayRemove` the `PhotoRef` from the entry. If a Storage object is already missing, treat as success (idempotent).

**C. Entry validation** — `activityContent` required (non-empty); `date` required and a valid `'YYYY-MM-DD'`; `durationMinutes` ≥ 0 if present. No token side effects anywhere in this phase.

**D. Bridge pre-fill (WS4)** — from an approved completion, construct a draft entry: `date = familyLocalDate(completion.reviewedAt)`, `activityContent = completion.activityTitleSnapshot`, `durationMinutes = activity.durationMinutes` (if available), `kidId`, `linkedCompletionId`, `linkedActivityId`. Open the composer pre-filled; the user finishes (mood/photos/note) and saves. Nothing is written until the user saves. Approving is **never blocked** by this.

---

## 6. Workstream summary
| WS | Title | Owner | Depends on | Parallel? |
|----|-------|-------|------------|-----------|
| **WS0** | Contracts & Storage infra | Agent A (blocking) | Phases 1–2 | No (first) |
| **WS1** | Timeline view (read) | Agent B | WS0 | Yes |
| **WS2** | Entry composer (create/edit) | Agent C | WS0, **WS3** | After WS3 |
| **WS3** | Photo pipeline & UI | Agent D | WS0 | Yes |
| **WS4** | Completion → log bridge | Agent E | WS2 (+ Phase 2 approval) | After WS2 |
| **WS5** | Polish (filters, mood summary, kid switcher) | Agent F | WS1 | After WS1 |
| **WS6** | Integration & verification | Agent A/G | WS1–WS5 | No (last) |

---

## 7. Detailed task breakdown

### WS0 — Contracts & Storage infra *(blocking)*
- **T0.1 — Firebase Storage setup.** Extend `firebase.ts` to export `storage` (`getStorage`). Add Storage to the project; in dev, **open Storage rules** (document the §12 blocker). **Acceptance:** a test upload/download round-trips.
- **T0.2 — Types & paths.** Add §5.1 types and §5.2 helpers. **Acceptance:** compiles; no token-type changes.
- **T0.3 — `images.ts` + `storage.ts`.** Canvas resize/compress + thumbnail; the upload/delete pipeline §5.4-A/B (EXIF dropped, orphan cleanup on failure, progress callback). **Acceptance:** a 12MP photo uploads as a ~<400KB full + small thumb; failed upload leaves no orphan objects; uploaded files carry no GPS EXIF.
- **T0.4 — `datetime.ts`.** Family-local date + `groupEntriesByDate` (human labels like "Today / Yesterday / Mon, Jun 8"). **Acceptance:** correct grouping/labels across day boundaries.
- **T0.5 — `growthlog.repo.ts`.** All §5.3 repo functions; ordering date desc; soft trash/restore; photo add/remove. **Acceptance:** CRUD + trash/restore live; remove-photo deletes Storage objects.
- **T0.6 — Context + seed.** `DataContext` subscribes to the growth log scoped to the currently viewed kid (parent can change the scope; kid is fixed to self); expose live entries + loading. Seed 1–2 sample entries with placeholder images. **Acceptance:** entries stream into context; scope change re-subscribes.

### WS1 — Timeline view (read)
- **T1.1 — `Timeline.tsx` + `GrowthEntryCard.tsx`.** Date-grouped chronological list; each card shows date/title, activity content, duration, participant avatars (+ free-text names), mood/energy emoji, note, and a photo thumbnail strip (tap → lightbox via WS3). Loading→skeleton; empty→`EmptyState` with a "Add first entry" CTA. **UI:** `card`, `avatar`, `badge`, `scroll-area`, `separator`, `skeleton`, `ImageWithFallback`. **Acceptance:** renders all entry shapes (no photos, many photos, no mood, etc.); reflects creates/edits/trashes live.
- **T1.2 — Kid `MyJourney.tsx`.** Kid sees their own timeline + an "Add entry" button (opens WS2 composer). **Acceptance:** scoped to the current kid only.
- **T1.3 — Parent `GrowthLog.tsx`.** Same timeline with a **kid switcher** (segmented control / select) to view any kid's log; "Add entry" for the selected kid. **UI:** `tabs`/`select`. **Acceptance:** switching kids re-scopes the timeline live.

### WS3 — Photo pipeline & UI
- **T3.1 — `PhotoUploader.tsx`.** Drag-and-drop + file picker (`accept="image/*"`, multiple); per-file progress; client-side preview; enforce per-entry cap (D5) and size/type validation with friendly errors; calls `uploadEntryPhoto`. **No HTML `<form>`.** **UI:** `button`, `progress`, `ImageWithFallback`, `sonner`. **Acceptance:** uploads N photos with visible progress; rejects oversized/non-image with a clear message; cancelling mid-flow cleans up.
- **T3.2 — `PhotoGallery.tsx` + `PhotoLightbox.tsx`.** Thumbnail grid inside an entry; click → full-screen lightbox with prev/next and a remove action (→ `removePhotoFromEntry`, confirm). **UI:** `dialog`, `button`, `ImageWithFallback`. **Acceptance:** lightbox navigates; remove deletes from Storage + entry and updates live.

### WS2 — Entry composer (create/edit)  *(depends on WS3)*
- **T2.1 — `EntryComposerDialog.tsx`.** Create or edit an entry: date (default today, editable), title (optional), activity content (required), duration, `ParticipantPicker`, `MoodEnergyPicker`, note, and `PhotoUploader`/`PhotoGallery`. Validate per §5.4-C; `createEntry`/`updateEntry`; toast on success. **No HTML `<form>`.** **UI:** `dialog`, `input`, `textarea`, `label`, `calendar`/date input, `button`, `sonner`. **Acceptance:** create and edit both work; new/edited entry appears in the timeline live; photos attach correctly.
- **T2.2 — `MoodEnergyPicker.tsx`.** Two single-select emoji rows (mood §8.2, energy §8.2), clearable. **Acceptance:** selection persists onto the entry; clear works.
- **T2.3 — `ParticipantPicker.tsx`.** Multi-select of family profiles (avatars) + an "add other" free-text chip input. **Acceptance:** both profile IDs and free-text names save and render on the card.

### WS4 — Completion → log bridge  *(depends on WS2 + Phase 2 approval UI)*
- **T4.1 — "Add to growth log" affordance.** In `ApprovalInbox`, after a completion is approved, show an optional "Add to {kid}'s journey" action that opens the composer pre-filled per §5.4-D. Also offer the same on the kid side after a submission is approved (optional). **Acceptance:** approving is never blocked; the pre-filled composer opens on demand; saving creates a `linked*` entry; declining writes nothing.

### WS5 — Polish  *(depends on WS1)*
- **T5.1 — Filters.** Date-range and mood filters on the timeline (drive `subscribeGrowthLog` `from`/`to`, client-filter mood). **Acceptance:** filtering updates the list; clearing restores all.
- **T5.2 — `MoodSummaryChip.tsx`.** A small glance of the kid's recent moods (e.g., last 7 entries) on Journey/Home. Read-only, decorative. **Acceptance:** reflects recent entries; degrades gracefully with no data.
- **T5.3 — (optional) Trash view.** List trashed entries with restore (D4). **Acceptance:** restore returns an entry to the timeline.

### WS6 — Integration & verification *(last)*
| Task | Goal | Acceptance |
|------|------|------------|
| T6.1 | Photo pipeline integrity | Upload → thumbnail + full stored; remove deletes both objects; failed upload leaves no orphans; no GPS EXIF on stored files. |
| T6.2 | Timeline correctness | Correct date grouping/order across day boundaries; live create/edit/trash/restore. |
| T6.3 | Scope isolation | A kid sees only their own log; parent kid-switcher re-scopes correctly; entries never bleed across kids. |
| T6.4 | Decoupling | No growth-log action touches balances, ledgers, negotiations, or streaks; approving is never blocked by the bridge. |
| T6.5 | Bridge | Pre-fill is accurate; declining writes nothing; linked entry references the right completion/activity. |
| T6.6 | Manual run + docs | Execute §11 with 2 kids; update `README.md` (Phase 3 scope, Storage setup, the privacy blocker). |

---

## 8. Logic / reference

### 8.1 Ordering & grouping
Entries order by `date` desc, then `createdAt` desc. `groupEntriesByDate` produces date buckets with friendly labels (Today / Yesterday / weekday+date).

### 8.2 Mood & energy sets ⚙️ *(PROPOSED — confirm in §13)*
- **Mood:** 😄 joyful · 😊 happy · 😌 calm · 😐 meh · 😴 tired · 😣 frustrated · 😢 sad
- **Energy:** 🔋 low · 🔋🔋 medium · ⚡ high
Both optional, single-select, clearable.

### 8.3 Photo handling
Max edge 1600px @ ~0.82 JPEG; 320px thumbnail; ≤8 photos/entry; ≤15MB/file pre-compress; types jpeg/png/webp/heic; EXIF dropped via canvas re-encode (§5.4-A); orphan cleanup on failed upload.

### 8.4 Decoupling rule
The growth log reads from `profiles` (for participants) and may *link* to a completion/activity, but **never writes** to tokens, ledger, negotiation, or streak data. The Phase 2 approve transaction is **not** modified in Phase 3.

### 8.5 Carried-over conventions
Repo-only data access; soft delete (archive/trash) over hard delete for entries; functional state; reuse `ui/` primitives + `ImageWithFallback`; no HTML `<form>`; loading/empty/error on every list.

---

## 9. Sequencing / parallelization (DAG)
```
        ┌──────── WS0 (blocking) ────────┐
        │ Storage + images + storage util │
        │ + datetime + types + repo + ctx  │
        └───────────────┬─────────────────┘
                        │ (contracts frozen)
            ┌───────────┴───────────┐
            ▼                       ▼
           WS1 (timeline)          WS3 (photo pipeline+UI)
            │                       │
            ▼                       ▼
           WS5 (polish)            WS2 (composer)  ── needs WS3 components
                                    │
                                    ▼
                                   WS4 (approval bridge) ── needs Phase 2 approval UI
            └───────────┬───────────┘
                        ▼
                       WS6
```
- **Critical path:** WS0 → WS3 → WS2 → WS4 → WS6.
- WS1/WS5 (read + polish) proceed independently of the photo-write path.

---

## 10. Integration milestones / demo script
"Phase 3 complete" when this runs end-to-end on a fresh machine *(use placeholder images, not real children's photos — see the privacy blocker):*
1. As **Kid Mia → My Journey**, add an entry: date today, "Built a Lego castle", 45 min, participants Mia + Dad, mood 😄, energy ⚡, a note, and 2 photos.
2. Entry appears at the top of Mia's timeline with thumbnails; open the lightbox, navigate, remove one photo → it disappears from the entry and Storage.
3. As **Parent → Journey**, switch to Mia → see the same entry; switch to Leo → empty state.
4. Edit the entry (change mood, add a photo) → updates live on both sides.
5. **Bridge:** parent approves one of Leo's completions → tap "Add to Leo's journey" → composer pre-filled with the activity + date → add a photo + mood → save → appears in Leo's timeline, linked to that completion.
6. Confirm **no token side effects** anywhere (balances, ledger, streaks unchanged by any logging action), and that approving worked whether or not the bridge was used.
7. Filter Mia's timeline by mood / date range; trash an entry, then restore it.

---

## 11. Manual verification checklist (WS6)
- [ ] Storage round-trips; uploaded files have no GPS/EXIF; thumbnails generated.
- [ ] Photo upload shows progress; rejects non-images and oversized files; enforces the per-entry cap.
- [ ] Removing a photo deletes both Storage objects and updates the entry live; missing-object removal is idempotent.
- [ ] Failed upload leaves no orphaned Storage objects.
- [ ] Create/edit entry validates required activity content + valid date; appears in the timeline live.
- [ ] Timeline groups/orders by date correctly (Today/Yesterday/older).
- [ ] Kid sees only their own log; parent kid-switcher re-scopes; no cross-kid bleed.
- [ ] Mood/energy/participants (profiles + free-text) save and render.
- [ ] Bridge pre-fill is accurate; declining writes nothing; approving never blocked.
- [ ] **No** balance/ledger/negotiation/streak change results from any growth-log action.
- [ ] Trash hides an entry; restore returns it.
- [ ] All lists handle loading / empty / error.

---

## 12. Out of scope — DO NOT BUILD in Phase 3
- **Video attachments** (PRD explicitly defers).
- **Real authentication & invite flow** (deferred).
- **Production Firestore & Storage security rules** — **blocking pre-deploy TODO** given child photos (see top banner).
- **Push / email notifications.**
- **Any token/reward coupling** to logging.
- **AI auto-captioning, PDF/keepsake export, social sharing** (possible Phase 4).

---

## 13. Open items to confirm before kickoff
*(⚙️ defaults are in place so this is unblocked — change any and I'll patch the affected tasks.)*
1. **Creation model (D2):** manual-first + opt-in bridge *(default)* — or do you want a draft entry **auto-created** on every approval?
2. **Who can edit (D3):** both parent and kid *(default)* — or parent-only / kid-only-on-own?
3. **Mood & energy sets (D6/§8.2):** confirm the proposed emoji sets, or give me your preferred list (and whether multi-select should be allowed).
4. **Delete model (D4):** soft trash + restore *(default)* — or allow permanent delete? Build the Trash view (T5.3) now or later?
5. **Image processing (D5):** Canvas-based, no new dependency *(default)* — or pull in `browser-image-compression`? Any different size/quality caps?
6. **Participants (D7):** profiles + free-text *(default)* — fine, or profiles-only?
7. **Scope of polish:** include filters + mood summary now (WS5), or ship the core log first and treat polish as Phase 3.5?

---

*End of Phase 3 plan.*
