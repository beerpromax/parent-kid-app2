# 📁 Parent‑Kid Activity App – Comprehensive Development Guide
*(intended for AI agents & human collaborators working directly in this repository)*

---

## 1. Overview  

| Item | Description |
|------|-------------|
| **Name** | `@figma/my-make-file` (a small React + Vite app) |
| **Purpose** | Let children earn “tokens” by completing chores/activities and spend them on rewards. Parents can manage activities and rewards. |
| **Tech stack** | React 18 (via `peerDependencies`), Vite 6, TypeScript, Tailwind CSS 4, Radix UI primitives, Shadcn‑UI‑style components, Lucide icons, Canvas‑Confetti. |
| **Entry point** | `src/main.tsx` (bootstraps `<App />` from `src/app/App.tsx`). |
| **Styling** | Tailwind config (`tailwind.css`), global CSS (`globals.css`), custom theme (`theme.css`). |
| **Package manager** | **pnpm** (workspace defined in `pnpm-workspace.yaml`). |
| **Runtime** | Browser – served by Vite dev server (`npm run dev`). |

The repo **must stay in this folder**; all AI‑agent actions (read, edit, run, etc.) should target the paths shown below.  

---

## 2. Directory Layout  

```
/ (repo root)
├─ ATTRIBUTIONS.md                     # Licenses & third‑party attribution
├─ README.md                           # Short project description (expand as needed)
├─ default_shadcn_theme.css            # Base theme for shadcn UI components
├─ guidelines/
│   └─ Guidelines.md                   # Contribution & UI guidelines (refer often)
├─ index.html                          # Vite HTML template
├─ package.json                        # Dependencies, scripts, peer deps
├─ pnpm-workspace.yaml                 # Workspace definition (future monorepo support)
├─ postcss.config.mjs                  # PostCSS config for Tailwind
├─ src/
│   ├─ app/
│   │   ├─ App.tsx                     # Core UI, state, token logic
│   │   └─ components/
│   │       ├─ figma/
│   │       │   └─ ImageWithFallback.tsx   # Helper component for images
│   │       └─ ui/                     # Shadcn/Radix UI primitives (accordion, button, …)
│   ├─ main.tsx                        # React root rendering
│   └─ styles/
│       ├─ fonts.css
│       ├─ globals.css
│       ├─ index.css
│       ├─ tailwind.css
│       └─ theme.css
├─ vite.config.ts                      # Vite config (TS, plugin‑react, path aliases)
└─ . (other dotfiles may appear in the future)
```

**Key UI component list** (`src/app/components/ui/`):

- Accordion, Alert‑Dialog, Alert, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, Context‑Menu, Dialog, Drawer, Dropdown‑Menu, Form, Hover‑Card, Input‑OTP, Input, Label, Menubar, Navigation‑Menu, Pagination, Popover, Progress, Radio‑Group, Resizable, Scroll‑Area, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner (toast), Switch, Table, Tabs, Textarea, Toggle‑Group, Toggle, Tooltip, `use-mobile.ts`, `utils.ts`.

All UI components are thin wrappers around **Radix UI primitives** with Tailwind styling; they follow the Shadcn design patterns.

---

## 3. Getting Started (Human & AI agents)

### 3.1 Prerequisites  

| Tool | Version (minimum) | Reason |
|------|-------------------|--------|
| **Node.js** | 20.x | Vite 6 requires recent Node |
| **pnpm** | 9.x | Workspace/lockfile consistency |
| **Git** | any (optional) | For version control |
| **Browser** | Chrome/Edge/Firefox (latest) | To view dev server |

### 3.2 First‑time Setup  

1. **Install dependencies**   

   ```bash
   pnpm install
   ```

   *AI agents*: Use the **Bash** tool with `pnpm install`. Verify success by checking `node_modules` existence or parsing the stdout.  

2. **Run the dev server**   

   ```bash
   pnpm dev
   ```

   The Vite dev server starts on **http://localhost:5173** (default).  

   *AI agents*:  
   - Use the **run** skill (`/run`) to launch the app, or just `pnpm dev` via Bash.  
   - After launch, you can query the page with the **verify** skill to confirm UI renders.  

3. **Open the UI**  

   Point a browser to the URL shown in the console. You should see the **Kid View** by default, token balance 45, a list of activities, and a rewards store.

### 3.3 Build for Production  

```bash
pnpm build
```

Creates a `dist/` folder that can be served by any static web server.

*AI agents*: After building, you may run `npm run preview` (Vite preview) or inspect the `dist` folder with `ls -R dist`.

---

## 4. Core Application Concepts  

| Concept | Where it lives | Description |
|---------|----------------|-------------|
| **Mode** (`parent` | `kid`) | `src/app/App.tsx` line 22 | Controls UI – Kid see activities/rewards; Parent see management screens. |
| **Token balance** | State `tokenBalance` (line 23) | Starts at `45`; updated when an activity is completed or a reward redeemed. |
| **Activities** | `activities` state (line 24‑53) | Each has `id`, `title`, `description`, `tokens`, `completed`. |
| **Rewards** | `rewards` state (line 55‑91) | `id`, `title`, `description`, `cost`, `icon`. |
| **Confetti** | Imported `canvas-confetti` (line 3) | Visual feedback on completion/redeem. |
| **UI primitives** | `src/app/components/ui/*` | Pre‑styled Radix components – use them for any new UI. |
| **Images** | `src/app/components/figma/ImageWithFallback.tsx` | Helper to lazy‑load images with fallback; reuse for any new graphics. |

---

## 5. Common Development Tasks (AI‑agent recipes)  

Below are **standard patterns** for the most frequent modifications. Each recipe includes the **preferred tool sequence** (Read → Edit / Write → Bash) and a short rationale for the tool choice.

### 5.1 Add a new **Activity**  

1. **Read** `src/app/App.tsx` at the activity array (lines 24‑53).  
2. **Edit** the `activities` initializer: insert a new object following the existing shape.  

   ```json
   {
     "id": "5",
     "title": "Take out the trash",
     "description": "Collect all trash and place it in the bin",
     "tokens": 7,
     "completed": false
   }
   ```

   *Tool*: `Edit` with `replace_all: false`. Use a unique `id`.  

3. **Optionally** add UI for the new activity – no code change needed because the list is rendered from state.

### 5.2 Add a new **Reward**  

Same steps as 5.1 but edit the `rewards` array (lines 55‑91).  

### 5.3 Change **Token cost** of an existing reward  

1. **Read** file to locate the reward object (search for its `title` via Bash `grep`).  
2. **Edit** the `cost` field only.  

### 5.4 Extend **Kid View** UI (e.g., add a “Progress Bar”)  

1. **Read** the JSX block under `mode === 'kid'` (`src/app/App.tsx` lines 188‑287).  
2. Insert the new component **inside** the appropriate `<section>` (e.g., after the activities grid).  
3. Use an existing UI component like `progress.tsx` to avoid creating fresh files.  

*Tip*: AI agents should prefer **importing** existing components rather than creating new ones.  

### 5.5 Update **Styling** (Tailwind)  

- Edit `src/styles/tailwind.css` to add custom utilities (e.g., `@layer utilities { .text-shadow { text-shadow: ... } }`).  
- Run `pnpm dev` and verify changes live‑reload.  

### 5.6 Replace an **Icon** with a Lucide icon  

1. Locate the JSX using the old icon (e.g., `<Gift>`).  
2. Update the import line at the top of `App.tsx` (line 2) to include the new icon from `lucide-react`.  
3. Replace the component name in JSX.  

### 5.7 Refactor **state handling** to a custom hook  

*When the app grows*:  

1. Create a new file `src/app/hooks/useActivityStore.ts`.  
2. Move the `useState` declarations and helper functions (`completeActivity`, `redeemReward`) into the hook.  
3. Export the hook and replace the body of `App` with a call to it.  

*AI agents*: Use **Write** to create the new file, then **Edit** the import and function calls.  

---

## 6. Testing & Verification  

The project currently **has no test suite**. Recommended approach for AI agents:

| Type | Tool | Example |
|------|------|---------|
| **Manual UI check** | `/verify` skill (or run the app and visually inspect) | Confirm that completing an activity adds tokens, confetti appears, reward button disables when insufficient tokens. |
| **Component unit test** (future) | Add `vitest` + `@testing-library/react` in `devDependencies` (Bash). | Write tests under `src/__tests__/`. |
| **End‑to‑end** | Use Playwright (install via `pnpm add -D playwright`) and run `pnpm playwright test`. | Validate kid → parent flow. |

*Until tests exist, AI agents should rely on the **verify** skill or a quick manual run to ensure correctness after edits.*  

---

## 7. Deployment Guidance  

Because the app is a static bundle:

1. Run `pnpm build`.  
2. Upload the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, S3‑static‑website).  

**AI‑agent tip**: Use the **Bash** tool to copy `dist/` to a remote server or push to a Git remote with a CI step that runs `pnpm build && npx netlify deploy`. Ensure any CI scripts are non‑destructive (no `--force` pushes).  

---

## 8. Working with AI Agents in This Repo  

### 8.1 Recommended Workflow  

| Step | Recommended Tool(s) | Why |
|------|----------------------|-----|
| **Explore code** | `Read`, `Bash grep/find` (quick), or `Explore` agent for broader searches | Obtain concrete locations before editing. |
| **Make a change** | `Edit` (preferred) → *fallback* `Write` for whole‑file rewrites | `Edit` sends a diff, safe and minimal. |
| **Run / Verify** | `/verify` skill or `pnpm dev` + `/verify` | Guarantees the UI works after the change. |
| **Commit** (if repository becomes a git repo) | Follow Git safety protocol (new commit, not amend). *Not required now* | Keeps history clean. |
| **Document** | Update `README.md` or `guidelines/Guidelines.md` with `Write` | Keeps docs in sync. |

### 8.2 Typical Bash Commands (AI‑agent ready)  

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all deps. |
| `pnpm dev` | Start Vite dev server. |
| `pnpm build` | Produce production bundle. |
| `grep -R "Activity" src/app` | Find all Activity usages. |
| `sed -n '1,200p' src/app/App.tsx` | Quick preview of the first 200 lines (avoid; use `Read`). |
| `npm exec --yes playwright install` | Install Playwright (future testing). |

**Note**: Avoid using `cat`, `head`, `sed`, or `awk` for file inspection – use the dedicated `Read` and `Edit` tools instead.  

### 8.3 Using Context7 for Docs  

When you need up‑to‑date docs for a library (e.g., Radix UI, Tailwind, Vite, Lucide), call the **Context7** plugin:

```json
{
  "tool": "mcp__plugin_context7_context7__resolve-library-id",
  "args": {
    "libraryName": "radix-ui/react-accordion",
    "query": "Radix accordion component API"
  }
}
```

Then use the returned library ID with `mcp__plugin_context7_context7__query-docs` to fetch the latest usage examples. This ensures AI agents rely on current docs rather than stale training data.  

---

## 9. Extending the Project  

### 9.1 Adding New Screens  

1. **Create a new component** in `src/app/components/ui/` (or a dedicated folder).  
2. Export it from an `index.ts` barrel file (optional).  
3. Import and render it in `App.tsx` under the appropriate mode (`kid` or `parent`).  

### 9.2 Internationalisation (i18n)  

- Install `react-i18next` (Bash: `pnpm add react-i18next i18next`).  
- Add a `src/locales/` folder with JSON translation files.  
- Wrap the app with `<I18nextProvider>` in `main.tsx`.  

**AI agents** should perform the **Write** step for new files, then **Edit** existing imports.  

### 9.3 Persisting Data  

Current app stores state only in memory. To persist across sessions:  

| Option | Minimal steps | Tools |
|--------|---------------|-------|
| **LocalStorage** | Replace `useState` with `usePersistedState` that reads/writes JSON to `localStorage`. | `Edit` App.tsx, create a tiny hook file. |
| **Backend API** | Add an Express (or Supabase) endpoint, fetch on mount, POST updates. | Requires new server code (out of scope now) and a `pnpm add` for the server lib. |

---

## 10. Contribution Guidelines (What AI agents should enforce)  

- **Follow the existing UI pattern**: all components use Tailwind + Radix; avoid custom CSS unless absolutely needed.  
- **Name files in kebab‑case**, components in PascalCase.  
- **Keep state immutable**: use functional updates (`setActivities(prev => ...)`) when possible.  
- **Accessibility**: ensure every interactive element has an accessible label (`aria-label` or visible text).  
- **No duplicate IDs**: every `id` field for activities/rewards must be unique. AI agents can run a quick check:  

  ```bash
  grep -R "id:" src/app/App.tsx | sort | uniq -d
  ```

  (If any duplicates appear, raise a warning).  
- **Commit style** (when Git is introduced): concise subject (< 70 chars), body explains *why* the change was made.  

---

## 11. Frequently Asked Operations (One‑liners for AI agents)  

| Goal | Command / Tool |
|------|----------------|
| **Read the whole App file** | `Read` `src/app/App.tsx` |
| **Find all usages of `tokenBalance`** | `Bash` `grep -R "tokenBalance" -n src` |
| **Add a new dependency (e.g., `dayjs`)** | `Bash` `pnpm add dayjs` |
| **Upgrade Tailwind to latest** | `Bash` `pnpm add -D tailwindcss@latest` |
| **Run the app and capture a screenshot** | `/run` skill (or `pnpm dev` then `/verify` with screenshot flag) |
| **Search Radix docs for “Popover”** | Context7 resolve/query as described in § 8.3 |
| **Create a new UI component file** | `Write` `src/app/components/ui/my-new-component.tsx` with skeleton code (`import React from "react"`…) |
| **Delete a component** | `Edit` with an empty `new_string` or `Write` a new version of the file without the component, then remove import lines. |
| **Add a new script to `package.json`** | `Read` → `Edit` the `"scripts"` block, inserting `"lint": "eslint ."` (maintain JSON formatting). |

---

## 12. Safety & Permissions Checklist  

- **Never run destructive Git commands** (the repo isn’t a git repo yet, but if it becomes one, avoid `reset --hard`, `push --force`).  
- **Never overwrite existing files without a prior `Read`** – the `Edit` tool enforces this.  
- **Do not commit secrets** – there are no secret files now; if any appear (`.env`), add them to `.gitignore` and refuse to commit.  
- **Confirm UI changes** by manually verifying with `/verify` rather than assuming success.  

---

## 13. Quick Reference Cheat‑Sheet (Markdown)  

```
# Commands
pnpm install          # install deps
pnpm dev              # start dev server
pnpm build            # production bundle

# Editing patterns
Read   <file>         # view current content
Edit   <file> old → new   # minimal change
Write  <new-file> …   # create/overwrite whole file

# Searching
Bash   grep -R "tokenBalance" -n src
Bash   find src -name "*.tsx"

# AI‑agent helpers
/verify                # open browser & check UI
/run                   # launch the app (fallback)
context7 resolve‑id    # get library ID
context7 query‑docs    # fetch latest docs
```

---  

### End‑of‑Guide  

This markdown file should be saved as `PROJECT_GUIDE.md` at the repository root. AI agents can now refer to it for onboarding, routine tasks, and safe automation within this folder.   
