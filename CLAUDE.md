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

## Architecture

### Data flow

All server data lives in a single **Zustand store** (`lib/store.ts`). On mount, `AppShell` calls `hydrate()` which fetches profile, exercises, workouts, templates, and bodyweight in parallel from Supabase. From that point, components read from the store and mutations call `lib/db.ts` functions then refresh the relevant slice.

```
Supabase (Postgres + Auth)
    ↕ lib/db.ts (typed async query helpers)
    ↕ lib/store.ts (Zustand — single source of truth)
         ↕ components/* (read store selectors, call store actions)
```

The **active workout draft** (in-progress logging session) is also held in the store (`draft` field) so it survives tab switches. The **rest timer** (`rest.endsAt`, `rest.duration`) lives in the store for the same reason; `RestTimer.tsx` ticks locally via `setInterval`.

### Auth gate

`app/page.tsx` (server) → `AppGate` (client) → checks `hasSupabase` flag → if no env vars shows `SetupNotice`; otherwise resolves the Supabase session and renders `Login` or `AppShell`.

`hasSupabase` is false when `NEXT_PUBLIC_SUPABASE_URL` contains `"YOUR-PROJECT"` or is absent. The app builds fine without env vars (placeholders prevent prerender crashes); runtime queries fail with a clear notice.

### Tabs

`AppShell` owns the active tab and renders one of five panels: `Dashboard`, `WorkoutLogger`, `Templates`, `Progress`, `Tools`. `TabBar` is generic (takes a `TabDef<T>[]` array) and follows the accessible `role="tablist"` / `aria-selected` pattern with arrow-key navigation.

### Database (Supabase)

Schema is in `supabase/schema.sql` — run it once in the Supabase SQL editor to create tables, enums, RLS policies, and seed exercises. Key design points:

- Built-in exercises have `user_id = null`; RLS allows all authenticated users to read them.
- Every other table is owner-only (`user_id = auth.uid()`).
- A trigger auto-creates a `profiles` row on signup.
- `workout_sets` and `template_sets` are deleted by cascade when the parent workout/template is deleted.

To add a new field: extend `lib/types.ts`, add the column to `supabase/schema.sql`, update the relevant `lib/db.ts` query, update the store if needed, then update components.

### Key libraries

- **`recharts@3`** — `LineChart` in `Progress.tsx` and `BodyweightChart.tsx`; `RadarChart` in `MuscleRadar.tsx`. All chart components are `"use client"` and wrapped in `ResponsiveContainer`.
- **`zustand@5`** — store created with plain `create` (no `persist`, no `immer`). Mutate by spreading: `set({ draft: { ...draft, name } })`.
- **`papaparse`** — CSV export only (`lib/csv.ts`). No CSV import in this app.

### Palette (Tailwind v4 `@theme` in `app/globals.css`)

Dark theme. Key tokens:
- `ember` / `ember-soft` — primary accent (active tab, buttons, charts, streak heatmap).
- `night` — darkest background; also used as text colour on ember buttons.
- `surface` / `surface-2` / `line` — card backgrounds and borders.
- `ink` / `ink-soft` / `ink-faint` — text hierarchy.
- `mg-*` colours (`mg-chest`, `mg-back`, etc.) — muscle-group accents used by `ExerciseFigure` and `MuscleRadar`.
- `heat-0..4` — heatmap intensity ramp (heat-0 = empty, heat-4 = max volume).

### Conventions

- `"use client"` on every component that uses state, effects, or browser APIs.
- Path alias `@/*` resolves to the project root (`tsconfig.json`).
- No comments inside functions unless capturing non-obvious behaviour.
- Selectors: always select the raw array from the store (`useStore(s => s.workouts)`) and filter with `useMemo` in the component — never filter inside the selector (new array reference per render trips React 19's snapshot check).
- `useStore.setState(fn)` is acceptable for patching store state from outside a component (e.g. in `Tools.tsx` after `updateProfile`).
