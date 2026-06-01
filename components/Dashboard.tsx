"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeStreaks, dailyTotals, localDay } from "@/lib/stats";
import { StreakHeatmap } from "./StreakHeatmap";
import { BodyweightChart } from "./BodyweightChart";
import { MuscleRadar } from "./MuscleRadar";
import { estimateOneRepMax, round1 } from "@/lib/oneRepMax";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface/70 p-3">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className={accent ? "text-2xl font-bold text-ember" : "text-2xl font-bold"}>
        {value}
      </div>
    </div>
  );
}

const BIG5 = [
  "Back Squat",
  "Bench Press (Barbell)",
  "Deadlift",
  "Overhead Press (Barbell)",
  "Barbell Row",
] as const;
const BIG5_LABELS: Record<string, string> = {
  "Back Squat": "Squat",
  "Bench Press (Barbell)": "Bench",
  "Deadlift": "Deadlift",
  "Overhead Press (Barbell)": "OHP",
  "Barbell Row": "Row",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function fmtDuration(s: number | null): string | null {
  if (!s) return null;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}

export function Dashboard({ onStart }: { onStart: () => void }) {
  const workouts = useStore((s) => s.workouts);
  const exercises = useStore((s) => s.exercises);
  const profile = useStore((s) => s.profile);
  const unit = profile?.unit ?? "kg";
  const startBlank = useStore((s) => s.startBlank);
  const startFromWorkout = useStore((s) => s.startFromWorkout);
  const startEdit = useStore((s) => s.startEdit);
  const draft = useStore((s) => s.draft);
  const [picking, setPicking] = useState(false);

  const { current, longest, total, thisWeek } = useMemo(() => {
    const totals = dailyTotals(workouts);
    const days = new Set(totals.keys());
    const { current, longest } = computeStreaks(days);
    let total = 0;
    totals.forEach((t) => (total += t.count));

    // Sessions in the last 7 calendar days.
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    const wk = localDay(weekAgo);
    let thisWeek = 0;
    totals.forEach((t, day) => {
      if (day >= wk) thisWeek += t.count;
    });
    return { current, longest, total, thisWeek };
  }, [workouts]);

  const big4Orm = useMemo(() => {
    return BIG5.map((name) => {
      const ex = exercises.find((e) => e.name === name);
      if (!ex) return { name, label: BIG5_LABELS[name], orm: null };
      let bestOrm = 0;
      for (const w of workouts) {
        for (const s of w.sets) {
          if (s.exercise_id === ex.id && !s.is_warmup && s.completed && s.reps > 0) {
            const orm = estimateOneRepMax(s.weight, s.reps, "epley");
            if (orm > bestOrm) bestOrm = orm;
          }
        }
      }
      return { name, label: BIG5_LABELS[name], orm: bestOrm > 0 ? round1(bestOrm) : null };
    });
  }, [workouts, exercises]);

  const recentWorkouts = useMemo(() => {
    return [...workouts]
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .slice(0, 8)
      .map((w) => {
        const seen = new Set<string>();
        const exerciseNames: string[] = [];
        for (const s of w.sets) {
          if (!seen.has(s.exercise_id)) {
            seen.add(s.exercise_id);
            const ex = exercises.find((e) => e.id === s.exercise_id);
            if (ex) exerciseNames.push(ex.name);
          }
        }
        const workingSetCount = w.sets.filter((s) => !s.is_warmup && s.completed).length;
        return { ...w, exerciseNames, workingSetCount };
      });
  }, [workouts, exercises]);

  function handleStart() {
    if (draft) { onStart(); return; }
    if (recentWorkouts.length === 0) { startBlank(); onStart(); return; }
    setPicking(true);
  }

  function pickEmpty() {
    startBlank();
    setPicking(false);
    onStart();
  }

  function repeatWorkout(w: (typeof recentWorkouts)[number]) {
    if (draft && !window.confirm("Replace the workout in progress?")) return;
    startFromWorkout(w);
    setPicking(false);
    onStart();
  }

  function editWorkout(w: (typeof recentWorkouts)[number]) {
    if (draft && !window.confirm("Replace the workout in progress?")) return;
    startEdit(w);
    onStart();
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleStart}
        className="rounded-xl bg-ember py-3 text-center font-semibold text-night hover:bg-ember-soft"
      >
        {draft ? "Resume workout" : "Start a workout"}
      </button>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current streak" value={`${current}d`} accent />
        <Stat label="Longest streak" value={`${longest}d`} />
        <Stat label="Last 7 days" value={`${thisWeek}`} />
        <Stat label="Total sessions" value={`${total}`} />
      </div>

      {big4Orm.some(({ orm }) => orm !== null) && (
        <div className="grid grid-cols-5 gap-2">
          {big4Orm.map(({ label, orm }) => (
            <div key={label} className="rounded-xl border border-line bg-surface/70 p-3 text-center">
              <div className="text-xs text-ink-faint">{label}</div>
              <div className="text-2xl font-bold text-ember">{orm ?? "—"}</div>
              <div className="text-xs text-ink-faint">{orm ? unit : "no data"}</div>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">Activity</h2>
        <StreakHeatmap />
      </section>

      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h2 className="mb-1 text-sm font-medium text-ink-soft">Bodyweight</h2>
        <BodyweightChart />
      </section>

      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h2 className="mb-1 text-sm font-medium text-ink-soft">Muscle distribution</h2>
        <MuscleRadar />
      </section>

      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">Recent workouts</h2>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-ink-faint">No workouts logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentWorkouts.map((w) => {
              const dur = fmtDuration(w.duration_seconds);
              return (
                <li key={w.id} className="rounded-lg border border-line bg-night p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium text-ink">{w.name}</span>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
                        <span>{fmtDate(w.performed_at)}</span>
                        <span className="text-ink-faint">·</span>
                        <span>{w.workingSetCount} sets</span>
                        {dur && (
                          <>
                            <span className="text-ink-faint">·</span>
                            <span>{dur}</span>
                          </>
                        )}
                      </div>
                      {w.exerciseNames.length > 0 && (
                        <p className="mt-1.5 truncate text-xs text-ink-faint">
                          {w.exerciseNames.join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => editWorkout(w)}
                        className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => repeatWorkout(w)}
                        className="rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-night hover:bg-ember-soft"
                      >
                        Repeat
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {picking && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="font-semibold">Start a workout</h2>
              <button onClick={() => setPicking(false)} className="text-ink-faint hover:text-ink">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <button
                onClick={pickEmpty}
                className="mb-3 w-full rounded-lg border border-line py-3 text-center font-medium text-ink-soft hover:text-ink"
              >
                Empty workout
              </button>

              {recentWorkouts.length > 0 && (
                <>
                  <p className="mb-2 px-1 text-xs text-ink-faint">Repeat a previous workout</p>
                  <ul className="flex flex-col gap-1.5">
                    {recentWorkouts.map((w) => {
                      const dur = fmtDuration(w.duration_seconds);
                      return (
                        <li key={w.id}>
                          <button
                            onClick={() => repeatWorkout(w)}
                            className="w-full rounded-lg border border-line bg-night px-3 py-2.5 text-left hover:border-ember/50"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-medium text-ink">{w.name}</span>
                              <span className="shrink-0 text-xs text-ink-faint">{fmtDate(w.performed_at)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                              <span>{w.workingSetCount} sets</span>
                              {dur && (
                                <>
                                  <span className="text-ink-faint">·</span>
                                  <span>{dur}</span>
                                </>
                              )}
                            </div>
                            {w.exerciseNames.length > 0 && (
                              <p className="mt-1 truncate text-xs text-ink-faint">
                                {w.exerciseNames.join(" · ")}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
