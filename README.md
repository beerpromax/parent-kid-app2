# Parent–Kid Activity App

A family app where kids earn **tokens** by completing chores and activities, spend them on **rewards**, negotiate token rates with parents, and record memories in a **growth journey log**. Parents manage activities, approve completions, and fulfill reward redemptions.

## Repository structure

```
/                      Repo root — development plans live here
├─ PHASE1_DEV_PLAN.md  Phase 1: activities, completions, tokens (core loop)
├─ PHASE2_DEV_PLAN.md  Phase 2: rewards, redemptions, negotiation, streaks
├─ PHASE3_DEV_PLAN.md  Phase 3: growth journey log, photos, mood tags
├─ PHASE4_DEV_PLAN.md  Phase 4: Firebase Auth, invites, security rules, go-live
├─ webapp/             React + Vite web application (all four phases built)
├─ androidapp/         Android app (placeholder — not started)
└─ iosapp/             iOS app (placeholder — not started)
```

## Web app

The web app lives in [`webapp/`](webapp/). Stack: React 18, Vite 6, TypeScript, Tailwind CSS 4, shadcn-style components, Firebase (Firestore + Storage).

```bash
cd webapp
npm install
npm run dev
```

### Configuration

Runtime configuration comes from `webapp/.env.local` (not committed — see `webapp/.env.local.example`):

| Variable | Purpose |
|---|---|
| `VITE_USE_LOCAL_STORAGE` | `true` = run against the in-browser localStorage shim (no backend needed); `false` = use Firestore/Storage |
| `VITE_USE_FIREBASE_EMULATOR` | `true` = connect to local Firebase emulators (Firestore :8080, Storage :9199) |
| `VITE_FIREBASE_*` | Firebase web app config (API key, project ID, etc.) |

### Architecture notes

- All data access goes through repositories in `webapp/src/lib/repos/` — screens and components never call Firestore directly.
- Every repo is dual-backend: a localStorage branch (for offline prototyping) and a Firestore branch with transactional integrity guarantees (idempotent approvals, balance guards, negotiation invariants).
- **Auth model (Phase 4):** per-member email/password accounts. A parent signs up and creates the family; kids join by claiming a single-use invite code (generated in the parent's Family tab) with a username + password. Each auth account is bound 1:1 to a profile via `users/{uid}`; Firestore security rules scope all data to family members and restrict approvals/fulfillments to parents.
- See `webapp/PROJECT_GUIDE.md` and the phase plans for design decisions and verification checklists.

## Status

- ✅ Phases 1–3 implemented; verified against localStorage **and** live Firestore
- ✅ Phase 4: Firebase Auth + parent-invites-kid flow + production security rules, deployed to project `parent-kid-app2` and verified live (including rules negative-tests)
- ⏸ Photos/Storage deferred (needs Blaze plan) — uploader is hidden in live mode (`VITE_ENABLE_PHOTOS`)
- ⛔ Mobile apps not started

> **Privacy note:** photo uploads stay disabled until Firebase Storage is set up with locked-down Storage rules (tracked in PHASE4_DEV_PLAN §7).
