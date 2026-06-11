import { create } from "zustand";
import type {
  BodyweightEntry,
  Exercise,
  MuscleGroup,
  Profile,
  WorkoutWithSets,
} from "./types";
import * as db from "./db";
import type { TemplateWithSets } from "./db";

export interface DraftSetEntry {
  weight: number;
  reps: number;
  done: boolean;
  isWarmup: boolean;
  rpe: number | null;
}

export interface DraftExercise {
  exerciseId: string;
  unit: "kg" | "lb";
  sets: DraftSetEntry[];
  notes: string;
}

export interface Draft {
  name: string;
  startedAt: number;
  exercises: DraftExercise[];
  workoutId?: string; // present when editing an existing saved workout
}

interface RestState {
  endsAt: number | null;
  duration: number;
}

interface StoreState {
  // server data
  loaded: boolean;
  exercises: Exercise[];
  workouts: WorkoutWithSets[];
  templates: TemplateWithSets[];
  bodyweight: BodyweightEntry[];
  profile: Profile | null;

  // active logging session
  draft: Draft | null;

  // rest timer (lives here so it survives tab switches)
  rest: RestState;

  hydrate: () => Promise<void>;
  reset: () => void;
  refreshWorkouts: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshBodyweight: () => Promise<void>;
  refreshExercises: () => Promise<void>;

  // draft actions
  startBlank: () => void;
  startFromTemplate: (t: TemplateWithSets) => void;
  startFromWorkout: (w: WorkoutWithSets) => void;
  startEdit: (w: WorkoutWithSets) => void;
  setDraftName: (name: string) => void;
  addDraftExercise: (exerciseId: string) => void;
  replaceDraftExercise: (exIdx: number, exerciseId: string) => void;
  toggleDraftExerciseUnit: (exIdx: number) => void;
  setDraftExerciseNotes: (exIdx: number, notes: string) => void;
  removeDraftExercise: (exIdx: number) => void;
  insertDraftExercise: (exIdx: number, exercise: DraftExercise) => void;
  addDraftSet: (exIdx: number) => void;
  updateDraftSet: (exIdx: number, setIdx: number, patch: Partial<DraftSetEntry>) => void;
  removeDraftSet: (exIdx: number, setIdx: number) => void;
  insertDraftSet: (exIdx: number, setIdx: number, set: DraftSetEntry) => void;
  discardDraft: () => void;
  finishWorkout: () => Promise<void>;

  // timer
  startRest: (seconds: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  stopRest: () => void;

  // helpers
  muscleOf: (exerciseId: string) => MuscleGroup | undefined;
  exerciseById: (id: string) => Exercise | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
  loaded: false,
  exercises: [],
  workouts: [],
  templates: [],
  bodyweight: [],
  profile: null,
  draft: null,
  rest: { endsAt: null, duration: 90 },

  hydrate: async () => {
    const [profile, exercises, workouts, templates, bodyweight] =
      await Promise.all([
        db.getProfile(),
        db.listExercises(),
        db.listWorkouts(),
        db.listTemplates(),
        db.listBodyweight(),
      ]);

    let savedDraft: Draft | null = null;
    try {
      const raw = localStorage.getItem("ironlog-draft");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        savedDraft = isValidDraft(parsed) ? parsed : null;
      }
    } catch {}
    // A draft that failed validation (corrupt / wrong shape) would crash the app
    // on every launch — drop it so we recover instead of bricking.
    if (!savedDraft) {
      try { localStorage.removeItem("ironlog-draft"); } catch {}
    }

    set({
      profile,
      exercises,
      workouts,
      templates,
      bodyweight,
      rest: { endsAt: null, duration: profile.default_rest_seconds },
      loaded: true,
      ...(savedDraft ? { draft: savedDraft } : {}),
    });
  },

  // Wipe all in-memory state and any persisted draft. Called on sign-out so the
  // next user never sees the previous user's data (or inherits their draft).
  reset: () => {
    try { localStorage.removeItem("ironlog-draft"); } catch {}
    set({
      loaded: false,
      exercises: [],
      workouts: [],
      templates: [],
      bodyweight: [],
      profile: null,
      draft: null,
      rest: { endsAt: null, duration: 90 },
    });
  },

  refreshWorkouts: async () => set({ workouts: await db.listWorkouts() }),
  refreshTemplates: async () => set({ templates: await db.listTemplates() }),
  refreshBodyweight: async () => set({ bodyweight: await db.listBodyweight() }),
  refreshExercises: async () => set({ exercises: await db.listExercises() }),

  startBlank: () =>
    set({ draft: { name: "Workout", startedAt: Date.now(), exercises: [] } }),

  startFromTemplate: (t) => {
    const defaultUnit = get().profile?.unit ?? "kg";
    const byExercise = new Map<string, DraftSetEntry[]>();
    const order: string[] = [];
    for (const s of [...t.sets].sort((a, b) => a.set_index - b.set_index)) {
      if (!byExercise.has(s.exercise_id)) {
        byExercise.set(s.exercise_id, []);
        order.push(s.exercise_id);
      }
      byExercise.get(s.exercise_id)!.push({
        weight: s.weight,
        reps: s.reps,
        done: false,
        isWarmup: false,
        rpe: null,
      });
    }
    set({
      draft: {
        name: t.name,
        startedAt: Date.now(),
        exercises: order.map((exerciseId) => ({
          exerciseId,
          unit: defaultUnit,
          sets: byExercise.get(exerciseId)!,
          notes: "",
        })),
      },
    });
  },

  startFromWorkout: (w) => {
    const defaultUnit = get().profile?.unit ?? "kg";
    const byExercise = new Map<string, { unit: "kg" | "lb"; notes: string; sets: DraftSetEntry[] }>();
    const order: string[] = [];
    for (const s of [...w.sets].filter((s) => s.completed).sort((a, b) => a.set_index - b.set_index)) {
      if (!byExercise.has(s.exercise_id)) {
        byExercise.set(s.exercise_id, { unit: s.unit ?? defaultUnit, notes: s.notes ?? "", sets: [] });
        order.push(s.exercise_id);
      }
      byExercise.get(s.exercise_id)!.sets.push({
        weight: s.weight,
        reps: s.reps,
        done: false,
        isWarmup: s.is_warmup,
        rpe: null,
      });
    }
    set({
      draft: {
        name: w.name,
        startedAt: Date.now(),
        exercises: order.map((exerciseId) => ({
          exerciseId,
          unit: byExercise.get(exerciseId)!.unit,
          sets: byExercise.get(exerciseId)!.sets,
          notes: byExercise.get(exerciseId)!.notes,
        })),
      },
    });
  },

  startEdit: (w) => {
    const defaultUnit = get().profile?.unit ?? "kg";
    const byExercise = new Map<string, { unit: "kg" | "lb"; notes: string; sets: DraftSetEntry[] }>();
    const order: string[] = [];
    for (const s of [...w.sets].sort((a, b) => a.set_index - b.set_index)) {
      if (!byExercise.has(s.exercise_id)) {
        byExercise.set(s.exercise_id, { unit: s.unit ?? defaultUnit, notes: s.notes ?? "", sets: [] });
        order.push(s.exercise_id);
      }
      byExercise.get(s.exercise_id)!.sets.push({
        weight: s.weight,
        reps: s.reps,
        done: s.completed,
        isWarmup: s.is_warmup,
        rpe: s.rpe ?? null,
      });
    }
    set({
      draft: {
        name: w.name,
        startedAt: Date.now(),
        workoutId: w.id,
        exercises: order.map((exerciseId) => ({
          exerciseId,
          unit: byExercise.get(exerciseId)!.unit,
          sets: byExercise.get(exerciseId)!.sets,
          notes: byExercise.get(exerciseId)!.notes,
        })),
      },
    });
  },

  setDraftName: (name) => {
    const draft = get().draft;
    if (draft) set({ draft: { ...draft, name } });
  },

  addDraftExercise: (exerciseId) => {
    const draft = get().draft;
    if (!draft) return;
    const unit = get().profile?.unit ?? "kg";
    set({
      draft: {
        ...draft,
        exercises: [
          ...draft.exercises,
          { exerciseId, unit, notes: "", sets: [{ weight: 0, reps: 0, done: false, isWarmup: false, rpe: null }] },
        ],
      },
    });
  },

  setDraftExerciseNotes: (exIdx, notes) => {
    const draft = get().draft;
    if (!draft) return;
    set({
      draft: {
        ...draft,
        exercises: draft.exercises.map((ex, i) => (i === exIdx ? { ...ex, notes } : ex)),
      },
    });
  },

  toggleDraftExerciseUnit: (exIdx) => {
    const draft = get().draft;
    if (!draft) return;
    set({
      draft: {
        ...draft,
        exercises: draft.exercises.map((ex, i) =>
          i === exIdx ? { ...ex, unit: ex.unit === "kg" ? "lb" : "kg" } : ex,
        ),
      },
    });
  },

  replaceDraftExercise: (exIdx, exerciseId) => {
    const draft = get().draft;
    if (!draft) return;
    set({
      draft: {
        ...draft,
        exercises: draft.exercises.map((ex, i) =>
          i === exIdx ? { ...ex, exerciseId } : ex,
        ),
      },
    });
  },

  removeDraftExercise: (exIdx) => {
    const draft = get().draft;
    if (!draft) return;
    set({
      draft: {
        ...draft,
        exercises: draft.exercises.filter((_, i) => i !== exIdx),
      },
    });
  },

  insertDraftExercise: (exIdx, exercise) => {
    const draft = get().draft;
    if (!draft) return;
    const exercises = [...draft.exercises];
    exercises.splice(exIdx, 0, exercise);
    set({ draft: { ...draft, exercises } });
  },

  addDraftSet: (exIdx) => {
    const draft = get().draft;
    if (!draft) return;
    const exercises = draft.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [
          ...ex.sets,
          {
            weight: last?.weight ?? 0,
            reps: last?.reps ?? 0,
            done: false,
            isWarmup: false,
            rpe: null,
          },
        ],
      };
    });
    set({ draft: { ...draft, exercises } });
  },

  updateDraftSet: (exIdx, setIdx, patch) => {
    const draft = get().draft;
    if (!draft) return;
    const exercises = draft.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)),
      };
    });
    set({ draft: { ...draft, exercises } });
  },

  removeDraftSet: (exIdx, setIdx) => {
    const draft = get().draft;
    if (!draft) return;
    const exercises = draft.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
    });
    set({ draft: { ...draft, exercises } });
  },

  insertDraftSet: (exIdx, setIdx, setEntry) => {
    const draft = get().draft;
    if (!draft) return;
    const exercises = draft.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = [...ex.sets];
      sets.splice(setIdx, 0, setEntry);
      return { ...ex, sets };
    });
    set({ draft: { ...draft, exercises } });
  },

  discardDraft: () => set({ draft: null, rest: { ...get().rest, endsAt: null } }),

  finishWorkout: async () => {
    const draft = get().draft;
    if (!draft) return;
    const sets: db.DraftSet[] = [];
    for (const ex of draft.exercises) {
      const note = ex.notes?.trim() || null;
      ex.sets.forEach((s, idx) => {
        if (!s.done) return;
        sets.push({
          exercise_id: ex.exerciseId,
          set_index: idx,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe ?? null,
          is_warmup: s.isWarmup,
          unit: ex.unit,
          notes: note,
        });
      });
    }
    if (draft.workoutId) {
      await db.updateWorkout(draft.workoutId, draft.name, sets);
    } else {
      await db.saveWorkout({
        name: draft.name,
        performed_at: new Date(draft.startedAt).toISOString(),
        duration_seconds: Math.round((Date.now() - draft.startedAt) / 1000),
        sets,
      });
    }
    set({ draft: null, rest: { ...get().rest, endsAt: null } });
    await get().refreshWorkouts();
  },

  startRest: (seconds) =>
    set({ rest: { endsAt: Date.now() + seconds * 1000, duration: seconds } }),
  // Nudge only the end time (min 5s remaining); the session default `duration`
  // is left untouched so the ±15s buttons don't reset future rest lengths.
  adjustRest: (deltaSeconds) => {
    const { rest } = get();
    if (rest.endsAt === null) return;
    const endsAt = Math.max(Date.now() + 5000, rest.endsAt + deltaSeconds * 1000);
    set({ rest: { ...rest, endsAt } });
  },
  stopRest: () => set({ rest: { ...get().rest, endsAt: null } }),

  muscleOf: (exerciseId) =>
    get().exercises.find((e) => e.id === exerciseId)?.muscle_group,
  exerciseById: (id) => get().exercises.find((e) => e.id === id),
}));

// Guard a persisted value before adopting it as the active draft. A parseable
// but wrong-shaped value (truncated write, schema drift) would otherwise crash
// render on every launch. Edit drafts (workoutId) are never persisted, so a
// stored one is stale and rejected.
function isValidDraft(v: unknown): v is Draft {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.name === "string" &&
    typeof d.startedAt === "number" &&
    Array.isArray(d.exercises) &&
    d.workoutId === undefined
  );
}

// Persist new-workout drafts across app close/reopen.
// Edit drafts (workoutId present) are never persisted — they are ephemeral.
if (typeof window !== "undefined") {
  useStore.subscribe((state, prev) => {
    if (state.draft === prev.draft) return;
    try {
      if (state.draft && !state.draft.workoutId) {
        localStorage.setItem("ironlog-draft", JSON.stringify(state.draft));
      } else {
        localStorage.removeItem("ironlog-draft");
      }
    } catch {}
  });
}
