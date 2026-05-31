"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { deleteTemplate, saveTemplate, type TemplateWithSets } from "@/lib/db";
import { MUSCLE_COLORS } from "@/lib/muscles";
import { ExerciseFigure } from "./ExerciseFigure";
import { ExercisePicker } from "./ExercisePicker";
import { SetRow } from "./SetRow";
import { TemplateEditor } from "./TemplateEditor";

export function WorkoutLogger() {
  const draft = useStore((s) => s.draft);
  const startBlank = useStore((s) => s.startBlank);
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
  const templates = useStore((s) => s.templates);
  const startFromTemplate = useStore((s) => s.startFromTemplate);

  const [picking, setPicking] = useState(false);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTpl, setEditingTpl] = useState<TemplateWithSets | null>(null);
  const [building, setBuilding] = useState(false);
  const [tplName, setTplName] = useState("New Template");
  const [tplExs, setTplExs] = useState<string[]>([]);
  const [pickingForTpl, setPickingForTpl] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [busyTpl, setBusyTpl] = useState<string | null>(null);

  const unit = profile?.unit ?? "kg";

  function startTemplate(t: TemplateWithSets) {
    if (draft && !window.confirm("Replace the workout in progress?")) return;
    startFromTemplate(t);
  }

  async function removeTpl(id: string) {
    if (!window.confirm("Delete this template?")) return;
    setBusyTpl(id);
    try {
      await deleteTemplate(id);
      await refreshTemplates();
    } finally {
      setBusyTpl(null);
    }
  }

  async function saveNewTemplate() {
    if (!tplName.trim() || tplExs.length === 0) return;
    setSavingTpl(true);
    try {
      const sets = tplExs.flatMap((exercise_id) =>
        [0, 1, 2].map((set_index) => ({ exercise_id, set_index, weight: 0, reps: 0 })),
      );
      await saveTemplate({ name: tplName.trim(), sets });
      await refreshTemplates();
      setBuilding(false);
      setTplName("New Template");
      setTplExs([]);
    } finally {
      setSavingTpl(false);
    }
  }

  if (!draft) {
    return (
      <>
        <div className="flex flex-col gap-4">
          {/* Templates */}
          <section className="rounded-xl border border-line bg-surface/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink-soft">Templates</h2>
              <button
                onClick={() => setBuilding(true)}
                className="rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-night hover:bg-ember-soft"
              >
                + New
              </button>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-ink-faint">
                No templates yet. Finish a workout and tap{" "}
                <span className="text-ink">Save as template</span>, or create one with + New.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {templates.map((t) => {
                  const ids = [...new Set(t.sets.map((s) => s.exercise_id))];
                  return (
                    <li key={t.id} className="rounded-lg border border-line bg-night p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-ink">{t.name}</span>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => setEditingTpl(t)}
                            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => startTemplate(t)}
                            className="rounded-lg bg-ember px-3 py-1.5 text-sm font-medium text-night hover:bg-ember-soft"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => removeTpl(t.id)}
                            disabled={busyTpl === t.id}
                            className="text-ink-faint hover:text-ember-soft disabled:opacity-40"
                            title="Delete template"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {ids.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ids.map((id) => {
                            const ex = exerciseById(id);
                            const count = t.sets.filter((s) => s.exercise_id === id).length;
                            return (
                              <div key={id} className="flex items-center gap-1 text-xs text-ink-soft">
                                <span style={{ color: MUSCLE_COLORS[ex?.muscle_group ?? "core"] }}>
                                  <ExerciseFigure pattern={ex?.movement_pattern ?? "other"} size={22} />
                                </span>
                                <span>
                                  {ex?.name ?? "?"}{" "}
                                  <span className="text-ink-faint">×{count}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button
            onClick={startBlank}
            className="rounded-lg border border-line bg-surface py-3 font-medium text-ink-soft hover:text-ink"
          >
            Start empty workout
          </button>
        </div>

        {/* New template builder */}
        {building && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center">
            <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-line bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-line p-4">
                <h2 className="font-semibold">New template</h2>
                <button
                  onClick={() => { setBuilding(false); setTplExs([]); setTplName("New Template"); }}
                  className="text-ink-faint hover:text-ink"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-line bg-night px-3 py-2 text-ink outline-none focus:border-ember"
                  placeholder="Template name"
                />

                {tplExs.length > 0 && (
                  <ul className="mb-3 flex flex-col gap-1.5">
                    {tplExs.map((id, i) => {
                      const ex = exerciseById(id);
                      return (
                        <li
                          key={`${id}-${i}`}
                          className="flex items-center gap-2 rounded-lg border border-line bg-night px-3 py-2"
                        >
                          <span style={{ color: MUSCLE_COLORS[ex?.muscle_group ?? "core"] }}>
                            <ExerciseFigure pattern={ex?.movement_pattern ?? "other"} size={24} />
                          </span>
                          <span className="flex-1 text-sm text-ink">{ex?.name ?? "?"}</span>
                          <button
                            onClick={() => setTplExs((prev) => prev.filter((_, j) => j !== i))}
                            className="text-ink-faint hover:text-ember-soft"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <button
                  onClick={() => setPickingForTpl(true)}
                  className="w-full rounded-lg border border-dashed border-line py-2 text-sm text-ink-soft hover:text-ink"
                >
                  + Add exercise
                </button>
              </div>

              <div className="border-t border-line p-4">
                <button
                  onClick={saveNewTemplate}
                  disabled={savingTpl || tplExs.length === 0 || !tplName.trim()}
                  className="w-full rounded-lg bg-ember py-2.5 font-medium text-night hover:bg-ember-soft disabled:opacity-50"
                >
                  {savingTpl ? "Saving…" : "Save template"}
                </button>
              </div>
            </div>
          </div>
        )}

        {pickingForTpl && (
          <ExercisePicker
            onPick={(id) => {
              setTplExs((prev) => [...prev, id]);
              setPickingForTpl(false);
            }}
            onClose={() => setPickingForTpl(false)}
          />
        )}

        {editingTpl && (
          <TemplateEditor
            template={editingTpl}
            onSave={async () => {
              await refreshTemplates();
              setEditingTpl(null);
            }}
            onClose={() => setEditingTpl(null)}
          />
        )}
      </>
    );
  }

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
      if (!window.confirm(isEdit ? "No sets marked complete. Discard changes?" : "No sets marked complete. Discard this workout?")) return;
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
              <SetRow
                key={setIdx}
                exIdx={exIdx}
                setIdx={setIdx}
                set={set}
                unit={unit}
              />
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
            if (window.confirm(draft.workoutId ? "Discard changes?" : "Discard this workout?")) discard();
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
