"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { saveTemplate } from "@/lib/db";
import { MUSCLE_COLORS } from "@/lib/muscles";
import { confirmDialog, promptDialog } from "@/lib/dialog";
import { toast } from "@/lib/toast";
import { ExerciseFigure } from "./ExerciseFigure";
import { ExercisePicker } from "./ExercisePicker";
import { SetRow } from "./SetRow";
import { Icon } from "./Reppa";

export function WorkoutLogger({ onClose }: { onClose: () => void }) {
  const draft = useStore((s) => s.draft);
  const setName = useStore((s) => s.setDraftName);
  const addExercise = useStore((s) => s.addDraftExercise);
  const replaceExercise = useStore((s) => s.replaceDraftExercise);
  const removeExercise = useStore((s) => s.removeDraftExercise);
  const insertExercise = useStore((s) => s.insertDraftExercise);
  const addSet = useStore((s) => s.addDraftSet);
  const toggleUnit = useStore((s) => s.toggleDraftExerciseUnit);
  const discard = useStore((s) => s.discardDraft);
  const finish = useStore((s) => s.finishWorkout);
  const exerciseById = useStore((s) => s.exerciseById);
  const profile = useStore((s) => s.profile);
  const refreshTemplates = useStore((s) => s.refreshTemplates);

  const [picking, setPicking] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const unit = profile?.unit ?? "kg";

  if (!draft) return null;

  const elapsedSec = Math.floor((now - draft.startedAt) / 1000);
  const elapsedStr =
    elapsedSec < 3600
      ? `${Math.floor(elapsedSec / 60)}m ${String(elapsedSec % 60).padStart(2, "0")}s`
      : `${Math.floor(elapsedSec / 3600)}h ${Math.floor((elapsedSec % 3600) / 60)}m`;

  const completedSets = draft.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.done).length,
    0,
  );

  async function saveAsTemplate() {
    if (!draft) return;
    const name = await promptDialog({
      title: "Save as template",
      placeholder: "Template name",
      defaultValue: draft.name,
      confirmLabel: "Save template",
    });
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
      toast.success(`Saved “${name}” as a template.`);
    } catch {
      toast.error("Couldn't save template. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function removeExerciseWithUndo(exIdx: number) {
    if (!draft) return;
    const meta = exerciseById(draft.exercises[exIdx].exerciseId);
    const snapshot = draft.exercises[exIdx];
    removeExercise(exIdx);
    toast.show(`Removed ${meta?.name ?? "exercise"}.`, {
      action: { label: "Undo", onClick: () => insertExercise(exIdx, snapshot) },
    });
  }

  async function onFinish() {
    if (!draft) return;
    const isEdit = !!draft.workoutId;
    if (completedSets === 0) {
      const ok = await confirmDialog({
        title: "Nothing logged yet",
        message: isEdit
          ? "No sets are marked complete. Discard your changes?"
          : "No sets are marked complete. Discard this workout?",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        danger: true,
      });
      if (!ok) return;
      discard();
      onClose();
      return;
    }
    setSaving(true);
    try {
      await finish();
      toast.success(isEdit ? "Workout updated." : "Workout saved.");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't save — your sets are safe, nothing was lost. ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function onDiscard() {
    if (!draft) return;
    const ok = await confirmDialog({
      title: draft.workoutId ? "Discard changes?" : "Discard workout?",
      message: draft.workoutId
        ? "Your edits to this workout won't be saved."
        : "This workout won't be saved.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      danger: true,
    });
    if (!ok) return;
    discard();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-line-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          aria-label="Close workout"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft hover:text-ink"
        >
          <Icon name="chevron" size={18} color="currentColor" style={{ transform: "rotate(90deg)" }} />
        </button>
        <input
          value={draft.name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workout name"
          className="flex-1 bg-transparent text-lg font-bold tracking-[-0.015em] text-ink outline-none"
          placeholder="Workout name"
        />
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-amber">
          {elapsedStr}
        </span>
      </div>

      {/* Scrollable exercises */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
          {draft.exercises.map((ex, exIdx) => {
            const meta = exerciseById(ex.exerciseId);
            const exUnit = ex.unit ?? unit;
            return (
              <div
                key={`${ex.exerciseId}-${exIdx}`}
                className="rounded-[24px] border border-line-2 bg-surface p-4 shadow-[var(--rp-shadow-sm)]"
              >
                <div className="mb-2 flex items-center gap-3">
                  <span style={{ color: MUSCLE_COLORS[meta?.muscle_group ?? "core"] }}>
                    <ExerciseFigure pattern={meta?.movement_pattern ?? "other"} size={34} />
                  </span>
                  <button
                    onClick={() => setSwappingIdx(exIdx)}
                    className="flex-1 text-left text-lg font-bold tracking-[-0.015em] text-ink hover:text-green-ink"
                    title="Change exercise"
                  >
                    {meta?.name ?? "Exercise"}
                  </button>
                  <button
                    onClick={() => toggleUnit(exIdx)}
                    aria-label={`Toggle units (currently ${exUnit})`}
                    className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft hover:text-ink"
                    title="Toggle kg / lb"
                  >
                    {exUnit}
                  </button>
                  <button
                    onClick={() => removeExerciseWithUndo(exIdx)}
                    aria-label={`Remove ${meta?.name ?? "exercise"}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-danger-soft"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                  <span className="w-6 text-center">#</span>
                  <span className="w-12 text-center">Type</span>
                  <span className="flex-1 text-center">Weight ({exUnit})</span>
                  <span className="flex-1 text-center">Reps</span>
                  <span className="w-12 text-right">1RM</span>
                  <span className="w-9 shrink-0" aria-hidden="true" />
                  <span className="w-7 shrink-0" aria-hidden="true" />
                </div>

                {ex.sets.map((set, setIdx) => (
                  <SetRow key={setIdx} exIdx={exIdx} setIdx={setIdx} set={set} unit={exUnit} />
                ))}

                <button
                  onClick={() => addSet(exIdx)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 border-t border-line-2 pt-3 text-sm font-semibold text-green-ink"
                >
                  <Icon name="plus" size={16} color="currentColor" sw={2.2} />
                  Add set
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setPicking(true)}
            className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-3 font-semibold text-ink-soft hover:text-ink"
          >
            <Icon name="plus" size={17} color="currentColor" sw={2.2} />
            Add exercise
          </button>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="shrink-0 border-t border-line-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        style={{ background: "color-mix(in srgb, var(--color-bg) 86%, transparent)", backdropFilter: "blur(16px)" }}
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            onClick={onFinish}
            disabled={saving}
            className="flex-1 rounded-full bg-green py-3 font-bold text-on-green hover:opacity-95 disabled:opacity-60"
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
              className="rounded-full border border-line bg-surface-2 px-3 py-3 text-sm text-ink-soft hover:text-ink disabled:opacity-50"
            >
              Template
            </button>
          )}
          <button
            onClick={onDiscard}
            className="rounded-full border border-line px-3 py-3 text-sm text-ink-faint hover:border-danger/50 hover:text-danger-soft"
          >
            Discard
          </button>
        </div>
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
