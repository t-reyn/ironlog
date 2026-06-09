"use client";

import { useStore, type DraftSetEntry } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Unit } from "@/lib/types";

// RPE below 5 isn't meaningful for tracking, so 1–4 collapse into a single "<5"
// bucket (stored as 5); the working range 6–10 stays granular.
const RPE_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "<5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
];

interface Props {
  exIdx: number;
  setIdx: number;
  set: DraftSetEntry;
  unit: Unit;
}

export function SetRow({ exIdx, setIdx, set, unit }: Props) {
  const update = useStore((s) => s.updateDraftSet);
  const remove = useStore((s) => s.removeDraftSet);
  const insert = useStore((s) => s.insertDraftSet);
  const startRest = useStore((s) => s.startRest);
  const restDuration = useStore((s) => s.rest.duration);

  function toggleDone() {
    const next = !set.done;
    update(exIdx, setIdx, { done: next });
    if (next && !set.isWarmup) startRest(restDuration);
  }

  function removeWithUndo() {
    const snapshot = set;
    remove(exIdx, setIdx);
    toast.show(`Removed set ${setIdx + 1}.`, {
      action: { label: "Undo", onClick: () => insert(exIdx, setIdx, snapshot) },
    });
  }

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg py-1 transition-colors",
        set.done ? "bg-mint/10" : "",
      ].join(" ")}
    >
      <span className="w-6 text-center text-xs font-medium text-ink-faint">{setIdx + 1}</span>

      <button
        onClick={() => update(exIdx, setIdx, { isWarmup: !set.isWarmup })}
        aria-pressed={set.isWarmup}
        title="Mark as warm-up set"
        className={[
          "w-12 shrink-0 rounded-md py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
          set.isWarmup
            ? "bg-steel/25 text-steel"
            : "bg-surface-2 text-ink-faint hover:text-ink-soft",
        ].join(" ")}
      >
        Warm
      </button>

      <input
        type="number"
        inputMode="decimal"
        aria-label={`Set ${setIdx + 1} weight in ${unit}`}
        value={set.weight || ""}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => update(exIdx, setIdx, { weight: parseFloat(e.target.value) || 0 })}
        className="w-full min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-2 text-center text-ink outline-none focus:border-ember"
        placeholder="0"
      />

      <input
        type="number"
        inputMode="numeric"
        aria-label={`Set ${setIdx + 1} reps`}
        value={set.reps || ""}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => update(exIdx, setIdx, { reps: parseInt(e.target.value) || 0 })}
        className="w-full min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-2 text-center text-ink outline-none focus:border-ember"
        placeholder="0"
      />

      <select
        aria-label={`Set ${setIdx + 1} RPE`}
        title="Rate of perceived exertion"
        value={set.rpe ?? ""}
        onChange={(e) => update(exIdx, setIdx, { rpe: e.target.value ? parseFloat(e.target.value) : null })}
        className="w-14 shrink-0 rounded-md border border-line bg-surface px-1 py-2 text-center text-xs font-mono text-ink-soft outline-none focus:border-ember"
      >
        <option value="">—</option>
        {RPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <button
        onClick={toggleDone}
        aria-pressed={set.done}
        aria-label={set.done ? `Set ${setIdx + 1} completed` : `Mark set ${setIdx + 1} complete`}
        title="Mark set complete (starts rest timer)"
        className={[
          "flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-base font-semibold transition-colors",
          set.done
            ? "bg-mint/20 text-mint"
            : "border border-line text-ink-faint hover:border-mint/50 hover:text-mint",
        ].join(" ")}
      >
        ✓
      </button>

      <button
        onClick={removeWithUndo}
        aria-label={`Remove set ${setIdx + 1}`}
        title="Remove set"
        className="flex h-10 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:text-danger-soft"
      >
        ✕
      </button>
    </div>
  );
}
