"use client";

import { useRef } from "react";
import { useStore, type DraftSetEntry } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { PrevHint } from "@/lib/progression";
import type { ExerciseType, SetType, Unit } from "@/lib/types";
import { Icon } from "./ShojinUI";

export const SET_GRID_COLS = "34px 1fr 62px 62px 44px";

// Tap the set-number cell to cycle: working set → warm-up → drop set.
const NEXT_SET_TYPE: Record<SetType, SetType> = {
  normal: "warmup",
  warmup: "drop",
  drop: "normal",
};

export type ValueField = "weight" | "reps" | "seconds";

/** The values a one-tap commit would write: explicit entry wins, else the
 *  prefilled last-session hint (kept as ghost text until committed). */
export function effectiveValues(set: DraftSetEntry, prev: PrevHint | null | undefined) {
  return {
    weight: set.weight !== 0 ? set.weight : (prev?.weight ?? 0),
    reps: set.reps !== 0 ? set.reps : (prev?.reps ?? 0),
    seconds: set.seconds !== 0 ? set.seconds : (prev?.seconds ?? 0),
  };
}

export function fmtPrev(
  prev: PrevHint | null | undefined,
  isDuration: boolean,
  isBodyweight = false,
): string {
  if (!prev) return "—";
  const core = isDuration
    ? `${prev.seconds}s`
    : `${isBodyweight ? "+" : ""}${prev.weight} × ${prev.reps}`;
  return prev.rpe != null ? `${core} @${prev.rpe}` : core;
}

function ValueCell({
  value,
  done,
  focused,
  label,
  onTap,
}: {
  value: string;
  done: boolean;
  focused: boolean;
  label: string;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      aria-label={label}
      className={[
        "flex h-11 items-center justify-center rounded-xl font-mono text-base font-semibold transition-colors",
        focused
          ? "border-[1.5px] border-amber bg-surface text-ink"
          : done
            ? "border border-transparent bg-transparent text-ink"
            : "border border-line bg-surface text-ink-faint",
      ].join(" ")}
    >
      {value || "–"}
    </button>
  );
}

interface Props {
  exIdx: number;
  setIdx: number;
  set: DraftSetEntry;
  unit: Unit;
  exerciseType: ExerciseType;
  isBodyweight: boolean;
  /** Same-position set from the last session — shown in PREVIOUS + as ghost prefill. */
  prev?: PrevHint | null;
  /** First undone set of the expanded exercise — gets the amber wash + ring. */
  active: boolean;
  /** Which field the keypad is currently editing on this set, if any. */
  focusField: ValueField | null;
  onTapValue: (field: ValueField) => void;
  /** One-tap commit of the (effective) values; un-commits when already done. */
  onToggleDone: () => void;
}

export function SetRow({
  exIdx,
  setIdx,
  set,
  unit,
  exerciseType,
  isBodyweight,
  prev,
  active,
  focusField,
  onTapValue,
  onToggleDone,
}: Props) {
  const update = useStore((s) => s.updateDraftSet);
  const remove = useStore((s) => s.removeDraftSet);
  const insert = useStore((s) => s.insertDraftSet);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);

  const isDuration = exerciseType === "duration";
  const warm = set.setType === "warmup";
  const eff = effectiveValues(set, prev);

  const weightStr =
    eff.weight !== 0 || set.done
      ? `${isBodyweight ? "+" : ""}${eff.weight}`
      : isBodyweight
        ? "+0"
        : "";
  const secondStr = isDuration
    ? eff.seconds !== 0 || set.done
      ? `${eff.seconds}`
      : ""
    : eff.reps !== 0 || set.done
      ? `${eff.reps}`
      : "";

  function removeWithUndo() {
    const snapshot = set;
    remove(exIdx, setIdx);
    toast.show(`Removed set ${setIdx + 1}.`, {
      action: { label: "Undo", onClick: () => insert(exIdx, setIdx, snapshot) },
    });
  }

  // Long-press anywhere on the row deletes the set (toast Undo keeps it
  // forgiving). A ~12px slop tolerates finger jitter but still yields to scrolls.
  function pressStart(e: React.PointerEvent) {
    longPressed.current = false;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      removeWithUndo();
    }, 550);
  }
  function pressEnd() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }
  function pressMove(e: React.PointerEvent) {
    const o = pressOrigin.current;
    if (!o) return;
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    if (dx * dx + dy * dy > 144) pressEnd();
  }
  function guard(fn: () => void) {
    return () => {
      if (longPressed.current) return;
      fn();
    };
  }

  return (
    <div
      data-set-row={`${exIdx}-${setIdx}`}
      onPointerDown={pressStart}
      onPointerUp={pressEnd}
      onPointerLeave={pressEnd}
      onPointerMove={pressMove}
      onContextMenu={(e) => e.preventDefault()}
      className={["mb-0.5 grid items-center gap-2 rounded-[14px] px-1 py-[5px]", active ? "bg-amber-soft" : ""].join(" ")}
      style={{ gridTemplateColumns: SET_GRID_COLS }}
    >
      <button
        onClick={guard(() => update(exIdx, setIdx, { setType: NEXT_SET_TYPE[set.setType] }))}
        aria-label={`Set ${setIdx + 1} type: ${set.setType}. Tap to change, hold to delete the set.`}
        title="Tap: working / warm-up / drop · hold: delete set"
        className="flex h-11 flex-col items-center justify-center gap-px"
      >
        <span
          className={[
            "font-mono text-sm font-bold",
            warm ? "text-ink-faint" : set.setType === "drop" ? "text-amber" : active ? "text-amber" : "text-ink-soft",
          ].join(" ")}
        >
          {warm ? "W" : set.setType === "drop" ? "D" : setIdx + 1}
        </span>
        {set.rpe != null && (
          <span className="font-mono text-[9px] leading-none text-ink-faint">@{set.rpe}</span>
        )}
      </button>

      <div className="min-w-0 truncate font-mono text-[12.5px] text-ink-faint">
        {fmtPrev(prev, isDuration, isBodyweight)}
      </div>

      <ValueCell
        value={weightStr}
        done={set.done}
        focused={focusField === "weight"}
        label={`Set ${setIdx + 1} ${isBodyweight ? "added weight" : "weight"} in ${unit}`}
        onTap={guard(() => onTapValue("weight"))}
      />
      <ValueCell
        value={secondStr}
        done={set.done}
        focused={focusField === (isDuration ? "seconds" : "reps")}
        label={isDuration ? `Set ${setIdx + 1} time in seconds` : `Set ${setIdx + 1} reps`}
        onTap={guard(() => onTapValue(isDuration ? "seconds" : "reps"))}
      />

      <button
        onClick={guard(onToggleDone)}
        aria-pressed={set.done}
        aria-label={set.done ? `Set ${setIdx + 1} completed` : `Log set ${setIdx + 1}`}
        title="Log this set (starts rest timer)"
        className={[
          "flex h-11 w-11 items-center justify-center rounded-[14px] transition-colors",
          set.done
            ? "bg-green text-on-green"
            : active
              ? "border-[1.5px] border-amber text-amber"
              : "border border-line text-ink-faint",
        ].join(" ")}
      >
        <Icon name="check" size={18} color="currentColor" sw={2.4} />
      </button>
    </div>
  );
}
