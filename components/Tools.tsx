"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/lib/db";
import { exportWorkoutsToCsv, downloadCsv } from "@/lib/csv";
import { estimateOneRepMax, blendedOneRepMax, round1 } from "@/lib/oneRepMax";
import { ExercisePicker } from "./ExercisePicker";
import type { Unit } from "@/lib/types";

export function Tools() {
  const workouts = useStore((s) => s.workouts);
  const exercises = useStore((s) => s.exercises);
  const profile = useStore((s) => s.profile);

  const unit = profile?.unit ?? "kg";
  const rest = profile?.default_rest_seconds ?? 90;

  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(5);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [pickingExercise, setPickingExercise] = useState(false);

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );

  const bestSet = useMemo(() => {
    if (!selectedExerciseId) return null;
    let best: { weight: number; reps: number } | null = null;
    let bestOrm = 0;
    for (const w of workouts) {
      for (const s of w.sets) {
        if (s.exercise_id === selectedExerciseId && !s.is_warmup && s.completed) {
          const orm = blendedOneRepMax(s.weight, s.reps);
          if (orm > bestOrm) {
            bestOrm = orm;
            best = { weight: s.weight, reps: s.reps };
          }
        }
      }
    }
    return best;
  }, [selectedExerciseId, workouts]);

  async function setUnit(u: Unit) {
    await updateProfile({ unit: u });
    useStore.setState((s) => ({ profile: s.profile ? { ...s.profile, unit: u } : s.profile }));
  }

  async function setRest(seconds: number) {
    await updateProfile({ default_rest_seconds: seconds });
    useStore.setState((s) => ({
      profile: s.profile ? { ...s.profile, default_rest_seconds: seconds } : s.profile,
      rest: { ...s.rest, duration: seconds },
    }));
  }

  function exportCsv() {
    const csv = exportWorkoutsToCsv(workouts, exercises);
    downloadCsv(`ironlog-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1RM calculator */}
      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h3 className="mb-3 font-medium">
          One-rep max estimator
          {selectedExercise && (
            <span className="ml-2 font-normal text-ember">— {selectedExercise.name}</span>
          )}
        </h3>

        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setPickingExercise(true)}
            className="flex-1 rounded-md border border-line bg-night px-3 py-1.5 text-left text-sm text-ink-soft hover:text-ink"
          >
            {selectedExercise ? selectedExercise.name : "Select an exercise…"}
          </button>
          {selectedExercise && (
            <button
              onClick={() => setSelectedExerciseId(null)}
              className="shrink-0 text-ink-faint hover:text-ember-soft"
              title="Clear exercise"
            >
              ✕
            </button>
          )}
        </div>

        {bestSet && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-night/60 px-3 py-2 text-sm">
            <span className="text-ink-soft">Best set:</span>
            <span className="text-ink">
              {bestSet.weight} {unit} × {bestSet.reps} reps
            </span>
            <button
              onClick={() => {
                setWeight(bestSet.weight);
                setReps(bestSet.reps);
              }}
              className="ml-auto rounded bg-ember/10 px-2 py-0.5 text-xs text-ember hover:bg-ember/20"
            >
              Use
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm text-ink-soft">
            Weight ({unit})
            <input
              type="number"
              value={weight || ""}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className="mt-1 w-24 rounded-md border border-line bg-night px-2 py-1 text-ink outline-none focus:border-ember"
            />
          </label>
          <label className="flex flex-col text-sm text-ink-soft">
            Reps
            <input
              type="number"
              value={reps || ""}
              onChange={(e) => setReps(parseInt(e.target.value) || 0)}
              className="mt-1 w-20 rounded-md border border-line bg-night px-2 py-1 text-ink outline-none focus:border-ember"
            />
          </label>
          <div className="rounded-lg border border-line bg-night px-5 py-2 text-center">
            <div className="text-xs text-ink-faint">Estimated 1RM</div>
            <div className="text-2xl font-semibold text-ember">
              {round1(estimateOneRepMax(weight, reps, "epley"))}
            </div>
            <div className="text-xs text-ink-faint">{unit}</div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h3 className="mb-3 font-medium">Preferences</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-ink-soft">Units</span>
          <div className="flex gap-1 rounded-lg border border-line p-1">
            {(["kg", "lb"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={[
                  "rounded-md px-3 py-1 text-sm",
                  unit === u ? "bg-ember text-night" : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-ink-soft">Default rest timer</span>
          <div className="flex gap-1 rounded-lg border border-line p-1">
            {[30, 60, 90, 120, 180].map((s) => (
              <button
                key={s}
                onClick={() => setRest(s)}
                className={[
                  "rounded-md px-2.5 py-1 text-sm",
                  rest === s ? "bg-ember text-night" : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="rounded-xl border border-line bg-surface/70 p-4">
        <h3 className="mb-3 font-medium">Data</h3>
        <button
          onClick={exportCsv}
          disabled={workouts.length === 0}
          className="w-full rounded-lg border border-line py-2.5 text-ink-soft hover:text-ink disabled:opacity-50"
        >
          Export workouts to CSV
        </button>
      </section>

      <button
        onClick={() => supabase.auth.signOut()}
        className="self-start text-sm text-ink-faint hover:text-ember-soft"
      >
        Sign out
      </button>

      {pickingExercise && (
        <ExercisePicker
          onPick={(id) => {
            setSelectedExerciseId(id);
            setPickingExercise(false);
          }}
          onClose={() => setPickingExercise(false)}
        />
      )}
    </div>
  );
}
