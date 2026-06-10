# Parent–Kid Activity App

A family app where kids earn **tokens** by completing chores and activities, spend them on **rewards**, negotiate token rates with parents, and record memories in a **growth journey log**. Parents manage activities, approve completions, and fulfill reward redemptions.

## Repository structure

```
/                      Repo root — development plans live here
├─ PHASE1_DEV_PLAN.md  Phase 1: activities, completions, tokens (core loop)
├─ PHASE2_DEV_PLAN.md  Phase 2: rewards, redemptions, negotiation, streaks
├─ PHASE3_DEV_PLAN.md  Phase 3: growth journey log, photos, mood tags
├─ webapp/             React + Vite web application (all three phases built)
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
- See `webapp/PROJECT_GUIDE.md` and the phase plans for design decisions and verification checklists.

## Status

- ✅ Phases 1–3 implemented and verified against the localStorage backend
- 🔜 Firestore go-live: real Firebase project, auth, production security rules
- ⛔ Mobile apps not started

> **Privacy note:** until real authentication and locked-down security rules are in place, do not deploy publicly or upload real photos of children.
