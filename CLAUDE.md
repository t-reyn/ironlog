# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical

**Next.js 16 + React 19 + Tailwind v4.** APIs differ from older versions — check `node_modules/next/dist/docs/` before writing framework code. Two React 19 lint rules are active and strict:

- `react-hooks/set-state-in-effect` — calling `setState` synchronously in a `useEffect` body is an error. Move it into an async callback or initialise state before the effect.
- `react-hooks/purity` — calling impure functions (e.g. `Date.now()`, `Math.random()`) directly in render is an error. Use a lazy initialiser `useState(() => Date.now())` instead.

Both rules occasionally need inline `eslint-disable-next-line` suppression with an explanatory comment (see `RestTimer.tsx` for the pattern).

## Commands

```bash
npm run dev -- --port 3200   # dev server (preview MCP uses this port)
npm run build                 # production build + type check
npm run lint                  # eslint (flat config, eslint.config.mjs)
```

No test suite — verify changes via the running dev server on port 3200.

## Deploy

Auto-deploys to Vercel on every push to `master` (GitHub repo: `t-reyn/ironlog`). Production URL: `https://ironlog-psi-two.vercel.app`. Branch pushes get preview URLs.

Supabase schema changes and auth config are applied via the Management API (project ref `drcxxxunbrqlbqwcolay`) using the access token in `.env.local`. Never commit `.env.local`.

## Architecture

### Data flow

All server data lives in a single **Zustand store** (`lib/store.ts`). On mount, `AppShell` calls `hydrate()` which fetches profile, exercises, workouts, templates, and bodyweight in parallel from Supabase. From that point, components read from the store and mutations call `lib/db.ts` functions then refresh the relevant slice.

```
Supabase (Postgres + Auth)
    ↕ lib/db.ts (typed async query helpers)
    ↕ lib/store.ts (Zustand — single source of truth)
         ↕ components/* (read store selectors, call store actions)
```

The **active workout draft** (`store.draft`) survives tab switches because it lives in the store. The **rest timer** (`store.rest`) lives there for the same reason.

### Auth gate

`app/page.tsx` (server) → `AppGate` (client) → checks `hasSupabase` flag → shows `SetupNotice`, `Login`, or `AppShell`.

Auth is **email + password** via `supabase.auth.signInWithPassword` / `signUp`. `hasSupabase` is false when `NEXT_PUBLIC_SUPABASE_URL` is absent or contains `"YOUR-PROJECT"` — the app builds and renders fine without env vars (placeholders prevent prerender crashes).

### Navigation & overlays

`AppShell` owns 4 tabs: **Dashboard**, **Log**, **Progress**, **Tools**.

Navigation is a **fixed bottom bar** (`<nav>`, `z-30`, with `env(safe-area-inset-bottom)` padding) that stacks the primary "Start workout" / "Continue workout →" button above the `TabBar`. This is the single entry point for all workout starts; when `draft` is set it reads "Continue workout →" and opens the logger directly. Main content carries `pb-36` so it clears the bar.

- **Log tab** always renders `<History />` (workout history list). It never renders the logger directly.
- **WorkoutLogger** is a `fixed inset-0 z-50` full-screen overlay rendered by `AppShell` when `showLogger && draft`. It receives `onClose` and calls it after finish or discard.
- **StartModal** is a `fixed inset-0 z-40` bottom-sheet overlay: Empty / Repeat previous / Use a template, plus the template list and `TemplateEditor`.

**z-index ladder** (everything is a sibling overlay — keep these distinct): bottom nav `z-30` → StartModal / ExercisePicker `z-40` → WorkoutLogger `z-50` → RestTimer `z-[60]` → Toaster `z-[70]` → DialogHost `z-[80]`. The RestTimer is rendered once in `AppShell` as a `fixed` element (not inside the logger) so it floats above both the bottom bar and the logger; `AppShell` passes a `bottomOffset` that shrinks when the logger is open.

### UI primitives — never use native `window.*` dialogs

Three small standalone Zustand stores back app-wide UI, each with a host component mounted once in `AppShell`:

- **`lib/toast.ts`** → `<Toaster />`. Import the `toast` helper (`toast.success/error/show`). `toast.show(msg, { action: { label: "Undo", onClick } })` renders an Undo button — this is the forgiveness pattern for destructive actions.
- **`lib/dialog.ts`** → `<DialogHost />`. `await confirmDialog({ title, message, danger })` returns a `boolean`; `await promptDialog({...})` returns `string | null`. Use these instead of `window.confirm` / `window.alert` / `window.prompt`.

Destructive flows (discard, replace, delete) call `confirmDialog({ danger: true })`; reversible removals (a set or exercise in the logger) instead remove immediately and surface a `toast` with an **Undo** action backed by `insertDraftSet` / `insertDraftExercise` store actions.

The template-creation modal is the shared `<TemplateBuilder />` component (used by both `StartModal` and `Tools`) — don't re-inline it.

### Database (Supabase)

Schema is in `supabase/schema.sql`. Key design:

- Built-in exercises have `user_id = null`; RLS lets all authenticated users read them.
- All other tables are owner-only (`user_id = auth.uid()`).
- A trigger auto-creates a `profiles` row on signup.
- `workout_sets` and `template_sets` cascade-delete with their parent.

To add a field: extend `lib/types.ts` → add column to `supabase/schema.sql` → update `lib/db.ts` query → update store if needed → update components.

To run SQL against the live DB from dev:
```bash
curl -X POST "https://api.supabase.com/v1/projects/drcxxxunbrqlbqwcolay/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT ..."}'
```

### Data safety — never delete user data

User workouts, templates, custom exercises, and bodyweight are the irreplaceable asset. They live only in Supabase Postgres (not in code), so **app/code deploys never touch them** — but schema work can. Rules for any iteration:

- **Migrations are additive only.** New field → `alter table … add column if not exists <name> … <nullable or with default>`. Never `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` (without a `where` you've verified), or rename a column/table as "cleanup".
- **`supabase/schema.sql` must stay idempotent and re-runnable** — `create table if not exists`, guarded enums, `on conflict … do update` seeds. It currently is; keep it that way (re-running it must never drop or recreate a populated table).
- **Never run destructive SQL via the Management API / SQL editor without (1) explicit user confirmation and (2) a fresh backup.** This includes anything that drops, truncates, or mass-updates rows.
- Take a backup before risky schema work: Supabase Dashboard → Database → Backups (enable PITR), or `pg_dump`. Per-user CSV export also exists in Profile → Data.
- RLS is owner-only and must stay enabled on every user table; a user can only ever affect their own rows.

### Store shape

```ts
draft: Draft | null          // active workout session; null = no workout in progress
  Draft.workoutId?           // present only when editing a saved workout (not a new one)
loaded: boolean              // false until hydrate() resolves
exercises / workouts /
  templates / bodyweight /
  profile                    // server data; refresh via store.refreshX() after mutations
rest: { endsAt, duration }   // rest timer state
```

Store mutations spread — no immer. `useStore.setState(fn)` is used outside components (e.g. `Tools.tsx` after `updateProfile`).

### Key libraries

- **`recharts@3`** — `LineChart` in `Progress.tsx` / `BodyweightChart.tsx`; `RadarChart` in `MuscleRadar.tsx`. All chart components are `"use client"` and wrapped in `ResponsiveContainer`.
- **`zustand@5`** — plain `create` (no persist, no immer).
- **`papaparse`** — CSV export only (`lib/csv.ts`).

### Palette (Tailwind v4 `@theme` in `app/globals.css`)

Dark theme. Key tokens:
- `ember` / `ember-soft` — primary accent (buttons, active tab, charts). **Not for destructive UI** — use `danger`.
- `danger` / `danger-soft` — destructive actions only (discard / delete / replace, error toasts/banners).
- `night` (#0f1115) — darkest background; text colour on ember buttons.
- `surface` / `line` — card backgrounds and borders.
- `ink` / `ink-soft` / `ink-faint` — text hierarchy. `ink-faint` is tuned to ~4.5:1 on `surface` (WCAG AA); don't darken it.
- `mg-*` — muscle-group colours used by `ExerciseFigure` and `MuscleRadar`.
- `heat-0..4` — heatmap intensity ramp.

## File map — read only what you need

| Task | Files to read |
|------|---------------|
| Add/change a type or data model | `lib/types.ts` |
| Add a DB field | `lib/types.ts`, `supabase/schema.sql`, `lib/db.ts` |
| Change a DB query | `lib/db.ts` |
| Change store shape or actions | `lib/store.ts` |
| Workout logging UI (sets, exercises, timer) | `components/WorkoutLogger.tsx`, `components/SetRow.tsx` |
| Exercise picker | `components/ExercisePicker.tsx` |
| Rest timer | `components/RestTimer.tsx`, `lib/store.ts` |
| Start workout / template select flow | `components/StartModal.tsx`, `components/TemplateEditor.tsx` |
| Template list/management | `components/Templates.tsx`, `components/TemplateEditor.tsx` |
| Dashboard stats / streaks | `components/Dashboard.tsx`, `lib/stats.ts` |
| Workout history list | `components/History.tsx` |
| ORM progress chart | `components/Progress.tsx`, `lib/stats.ts`, `lib/oneRepMax.ts` |
| Bodyweight chart | `components/BodyweightChart.tsx` |
| Muscle radar chart | `components/MuscleRadar.tsx`, `lib/muscles.ts` |
| Streak heatmap | `components/StreakHeatmap.tsx`, `lib/stats.ts` |
| Tab bar / navigation | `components/AppShell.tsx`, `components/TabBar.tsx` |
| Auth / login | `components/Login.tsx`, `components/AppGate.tsx`, `lib/supabase.ts` |
| CSV export | `lib/csv.ts`, `components/Tools.tsx` |
| Profile settings | `components/Tools.tsx`, `lib/db.ts` |
| Global styles / colour tokens | `app/globals.css` |
| ORM formulas | `lib/oneRepMax.ts` |
| Muscle group labels / colours | `lib/muscles.ts` |
| Exercise figure (stick figure) | `components/ExerciseFigure.tsx`, `lib/muscles.ts` |
| PWA / app metadata | `app/manifest.ts`, `app/layout.tsx` |

### Conventions

- `"use client"` on every component that uses state, effects, or browser APIs.
- Path alias `@/*` resolves to the project root (`tsconfig.json`).
- No comments inside functions unless capturing non-obvious behaviour.
- No native `window.confirm/alert/prompt` — use `confirmDialog`/`promptDialog`/`toast` (see UI primitives above).
- Icon-only buttons (`✕ ✓ ←`) need an `aria-label`; this is a mobile-first, touch-target-conscious UI.
- Always select the raw array from the store (`useStore(s => s.workouts)`) and filter/sort with `useMemo` in the component — never filter inside the selector (new array reference every render trips React 19's snapshot check).
- TypeScript closure narrowing does not apply inside function bodies — add an explicit `if (!draft) return` inside any function that uses `draft` even when the outer scope has already narrowed it.
