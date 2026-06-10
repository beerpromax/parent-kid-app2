# Family Coordination Webapp (Phase 1)

This webapp is a family coordination and task reward tracker designed for parents and kids. It allows parents to manage chores and review task submissions, while kids can check their assigned chores, submit completions, and track their earned tokens in their wallet.

## Features Implemented in Phase 1

- **Local Profile System**: Easily switch between a Parent profile and multiple Kid profiles (Mia and Leo) locally without passwords or signup.
- **Parent Activity Management**: Create, edit, and archive chores/activities. Chores can be assigned to specific kids or "All Kids" by default.
- **Parent Approval Inbox**: Review chore completions submitted by kids. Approve to grant tokens (uses transactional integrity to prevent double-crediting) or reject.
- **Family Dashboard**: A high-level overview for parents to see each kid's token balance, task completion count, and recent achievements.
- **Kid Activity view**: Shows available, pending, or rejected activities assigned to the kid.
- **Kid submission flow**: Submit completed chores with optional notes and celebrate with confetti.
- **Token Wallet**: View current token balances and a detailed transaction history log (showing the last 20 credits).
- **Rewards Catalog Stub**: A read-only "Coming Soon" preview of rewards.
- **Phase 2 - Streaks & Negotiations**: Real-time streaks tracking, negotiation offers for chore values and rewards, and catalog redemption.
- **Phase 3 - Growth Journey Log**: A chronological timeline of kid activities with duration, participants, mood/energy tags, notes, and photo attachments.

---

## ⚠️ Child-Photo Privacy Notice (Phase 3 Blocker)

This phase introduces **child-photo storage** using Firebase Storage. Since the app currently runs with no authentication and open rules (for developer local validation), **you must not deploy this application publicly or upload real photographs of children** until real authentication (Firebase Auth) and secure, restrictive Firestore and Storage security rules are configured. Use stock/placeholder images for local testing.

---

## Architectural Resiliency (Offline & Local Storage/IndexedDB Fallback)

To accommodate local environments where a live Firestore/Firebase Storage instance is not configured, the app automatically detects if local fallback is enabled:

1. **Local Storage (Firestore Fallback)**: When `VITE_USE_LOCAL_STORAGE=true`, database entries (profiles, tasks, ledger, negotiations) are stored reactively in `localStorage`.
2. **IndexedDB (Storage Fallback)**: Resized photo uploads and thumbnails are saved as Blobs inside browser **IndexedDB** under the database `FamilyAppStorage`. This keeps images fully offline, persisted across reloads, and prevents hitting the 5MB `localStorage` limit.

Client-side image processing automatically resizes uploads to max 1600px edge and **strips all EXIF metadata** (including GPS coordinates) for baseline privacy.

---

## Getting Started

### 1. Install Dependencies
Run from the `Figma_design` directory:
```bash
npm install
```

### 2. Configure Environment variables
Create/verify the `.env.local` file inside the `Figma_design` directory. By default, it is configured to use the Local Storage fallback:
```env
# Local Storage Fallback (Recommended for fast local testing without Java)
VITE_USE_LOCAL_STORAGE=true

# If you prefer to connect to the Firestore Emulator (requires Java runtime)
VITE_USE_FIREBASE_EMULATOR=true
VITE_FIREBASE_PROJECT_ID=parent-kid-app2

# If you prefer to connect to a Live Firebase Firestore Database
# VITE_FIREBASE_API_KEY=your-api-key
# VITE_FIREBASE_PROJECT_ID=your-project-id
# ...
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Target Project Structure
```
src/
├─ app/
│  ├─ App.tsx                         # Provider wrapper & role-based router
│  ├─ providers/
│  │  └─ AppProviders.tsx             # Context aggregation
│  ├─ context/
│  │  ├─ ProfileContext.tsx           # Profile switcher & mock session
│  │  └─ DataContext.tsx              # Reactive state subscriptions (real-time sync)
│  ├─ screens/
│  │  ├─ ProfilePicker.tsx            # Netflix-style role selector
│  │  ├─ parent/
│  │  │  ├─ ParentHome.tsx            # Parent navigation shell
│  │  │  ├─ ActivityManager.tsx       # Chore management (Create/Edit/Archive)
│  │  │  ├─ ActivityFormDialog.tsx    # Controlled form for chore details
│  │  │  ├─ ApprovalInbox.tsx         # Review inbox with custom Alert Dialogs
│  │  │  └─ FamilyDashboard.tsx       # Kids balances and completion history
│  │  └─ kid/
│  │     ├─ KidHome.tsx               # Kid navigation shell & confetti receiver
│  │     ├─ ActivityList.tsx          # Assigned tasks, pending reviews, retry states
│  │     ├─ SubmitCompletionDialog.tsx# Complete chore prompt (with notes input)
│  │     ├─ TokenWallet.tsx           # Balance & transaction history logs
│  │     └─ RewardsComingSoon.tsx     # Preview stub of rewards store catalog
│  └─ components/
│     ├─ ui/                          # Radix & Shadcn UI primitives
│     ├─ ProfileBadge.tsx             # Colored emoji avatars
│     ├─ TokenChip.tsx                # Token indicators with star icon
│     ├─ ActivityCard.tsx            # Activity metadata card layout
│     ├─ CompletionStatusBadge.tsx    # Pending/Approved/Rejected pill badges
│     └─ EmptyState.tsx               # Empty placeholder slots
├─ lib/
│  ├─ firebase.ts                     # Firebase app & Firestore initialization
│  ├─ types.ts                        # Compile-safe TS interfaces
│  ├─ paths.ts                        # Subcollection path builders
│  ├─ bootstrap.ts                    # Demo database seeding logic
│  └─ repos/
│     ├─ localStorageDb.ts            # Local reactive DB logic
│     ├─ profiles.repo.ts             # Profile database operations
│     ├─ activities.repo.ts           # Activity database operations
│     ├─ completions.repo.ts          # Submission & approval database transactions
│     └─ ledger.repo.ts               # Ledger history database operations
```