"use client";

import { useStore, type DraftSetEntry } from "@/lib/store";
import { blendedOneRepMax, round1 } from "@/lib/oneRepMax";
import type { Unit } from "@/lib/types";

interface Props {
  exIdx: number;
  setIdx: number;
  set: DraftSetEntry;
  unit: Unit;
}

export function SetRow({ exIdx, setIdx, set, unit }: Props) {
  const update = useStore((s) => s.updateDraftSet);
  const remove = useStore((s) => s.removeDraftSet);
  const startRest = useStore((s) => s.startRest);
  const restDuration = useStore((s) => s.rest.duration);

  const orm = set.isWarmup ? 0 : round1(blendedOneRepMax(set.weight, set.reps));

  function toggleDone() {
    const next = !set.done;
    update(exIdx, setIdx, { done: next });
    if (next && !set.isWarmup) startRest(restDuration);
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-6 text-center text-xs text-ink-faint">{setIdx + 1}</span>

      <button
        onClick={() => update(exIdx, setIdx, { isWarmup: !set.isWarmup })}
        title="Toggle warmup set"
        className={[
          "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
          set.isWarmup
            ? "bg-steel/20 text-steel"
            : "bg-surface text-ink-faint hover:text-ink-soft",
        ].join(" ")}
      >
        {set.isWarmup ? "Warm" : "Work"}
      </button>

      <label className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={set.weight || ""}
          onChange={(e) =>
            update(exIdx, setIdx, { weight: parseFloat(e.target.value) || 0 })
          }
          className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-right text-ink outline-none focus:border-ember"
          placeholder="0"
        />
        <span className="text-xs text-ink-faint">{unit}</span>
      </label>

      <span className="text-ink-faint">×</span>

      <input
        type="number"
        inputMode="numeric"
        value={set.reps || ""}
        onChange={(e) =>
          update(exIdx, setIdx, { reps: parseInt(e.target.value) || 0 })
        }
        className="w-14 rounded-md border border-line bg-surface px-2 py-1 text-right text-ink outline-none focus:border-ember"
        placeholder="0"
      />
      <span className="text-xs text-ink-faint">reps</span>

      <span className="ml-auto w-20 text-right text-xs text-ink-soft">
        {orm > 0 ? `1RM ${orm}` : ""}
      </span>

      <button
        onClick={toggleDone}
        title="Mark set complete (starts rest timer)"
        className={[
          "rounded-md px-2 py-1 text-sm transition",
          set.done
            ? "bg-mint/20 text-mint"
            : "border border-line text-ink-faint hover:text-ink",
        ].join(" ")}
      >
        ✓
      </button>
      <button
        onClick={() => remove(exIdx, setIdx)}
        title="Remove set"
        className="text-ink-faint hover:text-ember-soft"
      >
        ✕
      </button>
    </div>
  );
}
