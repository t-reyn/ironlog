"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { saveTemplate } from "@/lib/db";
import { MUSCLE_COLORS } from "@/lib/muscles";
import { ExerciseFigure } from "./ExerciseFigure";
import { ExercisePicker } from "./ExercisePicker";
import { SetRow } from "./SetRow";

export function WorkoutLogger() {
  const draft = useStore((s) => s.draft);
  const setName = useStore((s) => s.setDraftName);
  const addExercise = useStore((s) => s.addDraftExercise);
  const replaceExercise = useStore((s) => s.replaceDraftExercise);
  const removeExercise = useStore((s) => s.removeDraftExercise);
  const addSet = useStore((s) => s.addDraftSet);
  const discard = useStore((s) => s.discardDraft);
  const finish = useStore((s) => s.finishWorkout);
  const exerciseById = useStore((s) => s.exerciseById);
  const profile = useStore((s) => s.profile);
  const refreshTemplates = useStore((s) => s.refreshTemplates);

  const [picking, setPicking] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const unit = profile?.unit ?? "kg";

  if (!draft) return null;

  const completedSets = draft.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.done).length,
    0,
  );

  async function saveAsTemplate() {
    if (!draft) return;
    const name = window.prompt("Template name", draft.name);
    if (!name) return;
    const sets = draft.exercises.flatMap((ex) =>
      ex.sets.map((s, idx) => ({
        exercise_id: ex.exerciseId,
        set_index: idx,
        weight: s.weight,
        reps: s.reps,
      })),
    );
    setSaving(true);
    try {
      await saveTemplate({ name, sets });
      await refreshTemplates();
      window.alert("Saved as template.");
    } finally {
      setSaving(false);
    }
  }

  async function onFinish() {
    if (!draft) return;
    const isEdit = !!draft.workoutId;
    if (completedSets === 0) {
      if (
        !window.confirm(
          isEdit
            ? "No sets marked complete. Discard changes?"
            : "No sets marked complete. Discard this workout?",
        )
      )
        return;
      discard();
      return;
    }
    setSaving(true);
    try {
      await finish();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={draft.name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-lg font-medium outline-none focus:border-ember"
      />

      {draft.exercises.map((ex, exIdx) => {
        const meta = exerciseById(ex.exerciseId);
        return (
          <div
            key={`${ex.exerciseId}-${exIdx}`}
            className="rounded-xl border border-line bg-surface/70 p-3"
          >
            <div className="mb-2 flex items-center gap-3">
              <span style={{ color: MUSCLE_COLORS[meta?.muscle_group ?? "core"] }}>
                <ExerciseFigure pattern={meta?.movement_pattern ?? "other"} size={34} />
              </span>
              <button
                onClick={() => setSwappingIdx(exIdx)}
                className="flex-1 text-left font-medium text-ink hover:text-ember"
                title="Change exercise"
              >
                {meta?.name ?? "Exercise"}
              </button>
              <button
                onClick={() => removeExercise(exIdx)}
                className="text-ink-faint hover:text-ember-soft"
                title="Remove exercise"
              >
                ✕
              </button>
            </div>

            {ex.sets.map((set, setIdx) => (
              <SetRow key={setIdx} exIdx={exIdx} setIdx={setIdx} set={set} unit={unit} />
            ))}

            <button
              onClick={() => addSet(exIdx)}
              className="mt-2 w-full rounded-lg border border-dashed border-line py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              + Add set
            </button>
          </div>
        );
      })}

      <button
        onClick={() => setPicking(true)}
        className="rounded-lg border border-line bg-surface py-2.5 font-medium text-ink-soft hover:text-ink"
      >
        + Add exercise
      </button>

      <div className="flex gap-2">
        <button
          onClick={onFinish}
          disabled={saving}
          className="flex-1 rounded-lg bg-ember py-2.5 font-medium text-night hover:bg-ember-soft disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : draft.workoutId
              ? `Save changes (${completedSets} sets)`
              : `Finish (${completedSets} sets)`}
        </button>
        {!draft.workoutId && (
          <button
            onClick={saveAsTemplate}
            disabled={saving || draft.exercises.length === 0}
            className="rounded-lg border border-line px-3 py-2.5 text-sm text-ink-soft hover:text-ink disabled:opacity-50"
          >
            Save as template
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm(draft.workoutId ? "Discard changes?" : "Discard this workout?"))
              discard();
          }}
          className="rounded-lg border border-line px-3 py-2.5 text-sm text-ink-faint hover:text-ember-soft"
        >
          Discard
        </button>
      </div>

      {picking && (
        <ExercisePicker
          onPick={(id) => {
            addExercise(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {swappingIdx !== null && (
        <ExercisePicker
          onPick={(id) => {
            replaceExercise(swappingIdx, id);
            setSwappingIdx(null);
          }}
          onClose={() => setSwappingIdx(null)}
        />
      )}
    </div>
  );
}
