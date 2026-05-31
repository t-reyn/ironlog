"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { deleteTemplate, type TemplateWithSets } from "@/lib/db";
import { MUSCLE_COLORS } from "@/lib/muscles";
import { ExerciseFigure } from "./ExerciseFigure";

export function Templates({ onStart }: { onStart: () => void }) {
  const templates = useStore((s) => s.templates);
  const startFromTemplate = useStore((s) => s.startFromTemplate);
  const refreshTemplates = useStore((s) => s.refreshTemplates);
  const exerciseById = useStore((s) => s.exerciseById);
  const draft = useStore((s) => s.draft);
  const [busy, setBusy] = useState<string | null>(null);

  function exercisesOf(t: TemplateWithSets) {
    const ids: string[] = [];
    for (const s of [...t.sets].sort((a, b) => a.set_index - b.set_index)) {
      if (!ids.includes(s.exercise_id)) ids.push(s.exercise_id);
    }
    return ids;
  }

  function start(t: TemplateWithSets) {
    if (draft && !window.confirm("Replace the workout in progress?")) return;
    startFromTemplate(t);
    onStart();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this template?")) return;
    setBusy(id);
    try {
      await deleteTemplate(id);
      await refreshTemplates();
    } finally {
      setBusy(null);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface/60 p-10 text-center text-ink-soft">
        No templates yet. Finish a workout and tap{" "}
        <span className="text-ink">Save as template</span> to reuse it.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => {
        const ids = exercisesOf(t);
        return (
          <div key={t.id} className="rounded-xl border border-line bg-surface/70 p-4">
            <div className="flex items-center gap-3">
              <h3 className="flex-1 text-lg font-medium">{t.name}</h3>
              <button
                onClick={() => start(t)}
                className="rounded-lg bg-ember px-4 py-1.5 text-sm font-medium text-night hover:bg-ember-soft"
              >
                Start
              </button>
              <button
                onClick={() => remove(t.id)}
                disabled={busy === t.id}
                className="text-ink-faint hover:text-ember-soft"
                title="Delete template"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {ids.map((id) => {
                const ex = exerciseById(id);
                const count = t.sets.filter((s) => s.exercise_id === id).length;
                return (
                  <div key={id} className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <span style={{ color: MUSCLE_COLORS[ex?.muscle_group ?? "core"] }}>
                      <ExerciseFigure pattern={ex?.movement_pattern ?? "other"} size={26} />
                    </span>
                    <span>
                      {ex?.name ?? "?"} <span className="text-ink-faint">×{count}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
