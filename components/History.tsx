"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { deleteWorkout } from "@/lib/db";
import { confirmDialog } from "@/lib/dialog";
import { toast } from "@/lib/toast";
import { MUSCLE_COLORS } from "@/lib/muscles";
import type { MovementPattern } from "@/lib/types";
import { ExerciseIcon } from "./ExerciseIcon";
import { Eyebrow, Icon } from "./ShojinUI";

function fmtDuration(s: number | null) {
  if (!s) return null;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}
function fmtK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

export function History({ onStart, onNew }: { onStart: () => void; onNew: () => void }) {
  const workouts = useStore((s) => s.workouts);
  const exercises = useStore((s) => s.exercises);
  const startEdit = useStore((s) => s.startEdit);
  const startFromWorkout = useStore((s) => s.startFromWorkout);
  const draft = useStore((s) => s.draft);
  const refreshWorkouts = useStore((s) => s.refreshWorkouts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { allWorkouts, totalVolume } = useMemo(() => {
    const exMap = new Map(exercises.map((e) => [e.id, e]));
    const allWorkouts = [...workouts]
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .map((w) => {
        const seen = new Set<string>();
        const sessionExercises: { name: string; pattern: MovementPattern; color: string }[] = [];
        let volume = 0;
        for (const s of w.sets) {
          if (!s.is_warmup) volume += s.weight * s.reps;
          if (!seen.has(s.exercise_id)) {
            seen.add(s.exercise_id);
            const ex = exMap.get(s.exercise_id);
            if (ex)
              sessionExercises.push({
                name: ex.name,
                pattern: ex.movement_pattern,
                color: MUSCLE_COLORS[ex.muscle_group],
              });
          }
        }
        const rpes = w.sets.filter((s) => s.completed && s.rpe != null).map((s) => s.rpe!);
        const rpeAvg = rpes.length
          ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10
          : null;
        const d = new Date(w.performed_at);
        const workingSetCount = w.sets.filter((s) => !s.is_warmup && s.completed).length;
        return {
          ...w,
          sessionExercises,
          workingSetCount,
          volume,
          rpeAvg,
          dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
          dnum: String(d.getDate()).padStart(2, "0"),
        };
      });
    const totalVolume = allWorkouts.reduce((sum, w) => sum + w.volume, 0);
    return { allWorkouts, totalVolume };
  }, [workouts, exercises]);

  async function withReplaceGuard(action: () => void) {
    if (draft) {
      const ok = await confirmDialog({
        title: "Replace workout in progress?",
        message: "You have an unfinished workout. Starting this one will discard it.",
        confirmLabel: "Replace",
        cancelLabel: "Keep current",
        danger: true,
      });
      if (!ok) return;
    }
    action();
    onStart();
  }

  function editWorkout(w: (typeof allWorkouts)[number]) {
    withReplaceGuard(() => startEdit(w));
  }

  function repeatWorkout(w: (typeof allWorkouts)[number]) {
    withReplaceGuard(() => startFromWorkout(w));
  }

  async function removeWorkout(id: string, name: string) {
    const ok = await confirmDialog({
      title: "Delete workout?",
      message: `“${name}” will be permanently removed. This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteWorkout(id);
      await refreshWorkouts();
      toast.success(`Deleted “${name}”.`);
    } catch {
      toast.error("Couldn't delete workout.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-extrabold tracking-[-0.025em]">History</h1>
      </div>

      {allWorkouts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line-2 bg-surface p-8 text-center shadow-[var(--rp-shadow-sm)]">
          <p className="text-sm text-ink-soft">No workouts logged yet.</p>
          <button
            onClick={onNew}
            className="flex items-center gap-2 rounded-full bg-amber px-5 py-2.5 text-sm font-bold text-on-amber"
          >
            <Icon name="play" size={15} color="var(--color-on-amber)" />
            Start a workout
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Eyebrow>{allWorkouts.length} SESSIONS</Eyebrow>
            <div className="font-mono text-xs text-ink-soft">{fmtK(totalVolume)} kg lifetime</div>
          </div>

          <ul className="flex flex-col gap-2.5">
            {allWorkouts.map((w) => {
              const dur = fmtDuration(w.duration_seconds);
              const meta = [
                `${w.workingSetCount} SETS`,
                dur ? dur.toUpperCase() : null,
                w.readiness_sleep != null ? `SLEEP ${w.readiness_sleep}` : null,
                w.rpeAvg != null ? `RPE Ø${w.rpeAvg}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={w.id}
                  className="rounded-[28px] border border-line-2 bg-surface p-3.5 shadow-[var(--rp-shadow-sm)]"
                >
                  <button
                    onClick={() => editWorkout(w)}
                    className="flex w-full items-center gap-3 text-left"
                    title="Open and edit this workout"
                  >
                    <div className="w-10 shrink-0 text-center">
                      <div className="rp-eyebrow" style={{ fontSize: 9 }}>{w.dow}</div>
                      <div className="mt-px font-mono text-[19px] font-bold leading-tight text-ink">{w.dnum}</div>
                    </div>
                    <div className="w-px self-stretch bg-line-2" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold tracking-[-0.015em] text-ink">{w.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[10.5px] text-ink-faint">{meta}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold text-ink">{fmtK(w.volume)}</div>
                      <div className="rp-eyebrow" style={{ fontSize: 8.5 }}>KG VOL</div>
                    </div>
                  </button>

                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-line-2 pt-2.5">
                    <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                      {w.sessionExercises.slice(0, 6).map((ex, i) => (
                        <span key={i} className="shrink-0" style={{ color: ex.color }} title={ex.name}>
                          <ExerciseIcon name={ex.name} pattern={ex.pattern} size={24} />
                        </span>
                      ))}
                    </div>
                    {w.notes && (
                      <span className="max-w-[30%] truncate font-mono text-[10px] text-ink-faint">“{w.notes}”</span>
                    )}
                    <button
                      onClick={() => removeWorkout(w.id, w.name)}
                      disabled={deletingId === w.id}
                      aria-label={`Delete ${w.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-danger-soft disabled:opacity-40"
                      title="Delete workout"
                    >
                      {deletingId === w.id ? "…" : <Icon name="trash" size={15} color="currentColor" />}
                    </button>
                    <button
                      onClick={() => repeatWorkout(w)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-soft px-3.5 py-1.5 font-mono text-xs font-bold text-green-ink"
                    >
                      <Icon name="play" size={11} color="currentColor" />
                      Repeat
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
