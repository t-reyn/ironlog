"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { blendedOneRepMax, estimateOneRepMax, round1 } from "@/lib/oneRepMax";
import { localDay } from "@/lib/stats";
import { volumeByMuscle, MUSCLE_COLORS, MUSCLE_LABELS } from "@/lib/muscles";
import { toKg, type BodyweightEntry, type MuscleGroup } from "@/lib/types";
import { ExerciseIcon } from "./ExerciseIcon";
import { ExercisePicker } from "./ExercisePicker";
import { Eyebrow, Delta, Icon, Pill } from "./ShojinUI";

// Exact lifts only — no variants (e.g. not "Iso-Lateral … Bench Press").
const PR_LIFTS: { label: string; names: string[] }[] = [
  { label: "Bench", names: ["Bench Press (Barbell)"] },
  { label: "Squat", names: ["Back Squat"] },
  { label: "Deadlift", names: ["Deadlift", "Sumo Deadlift"] },
];

type Metric = "e1rm" | "top" | "volume" | "relative" | "time";

const WEIGHT_METRICS: { id: Metric; label: string }[] = [
  { id: "e1rm", label: "Est. 1RM" },
  { id: "top", label: "Top set" },
  { id: "volume", label: "Volume" },
];

const RELATIVE_METRIC = { id: "relative" as Metric, label: "×BW" };
const TIME_METRIC = { id: "time" as Metric, label: "Best time" };

/** Latest bodyweight (kg) logged on or before the given local day. */
function bodyweightKgOn(entries: BodyweightEntry[], day: string): number | null {
  let best: BodyweightEntry | null = null;
  for (const e of entries) {
    if (e.logged_on <= day) best = e;
    else break; // entries are sorted ascending by logged_on
  }
  return best ? toKg(best.weight, best.unit) : null;
}

export function Progress() {
  const workouts = useStore((s) => s.workouts);
  const exercises = useStore((s) => s.exercises);
  const bodyweight = useStore((s) => s.bodyweight);
  const unit = useStore((s) => s.profile?.unit ?? "kg");

  const logged = useMemo(() => {
    const ids = new Set<string>();
    workouts.forEach((w) => w.sets.forEach((s) => ids.add(s.exercise_id)));
    return exercises
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, exercises]);

  const [exerciseId, setExerciseId] = useState<string>("");
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [picking, setPicking] = useState(false);

  const selected = exerciseId || logged[0]?.id || "";
  const selectedMeta = exercises.find((e) => e.id === selected);
  const selectedName = selectedMeta?.name ?? "";
  const isDuration = selectedMeta?.exercise_type === "duration";
  const hasBodyweight = bodyweight.length > 0;

  const metricChoices = isDuration
    ? [TIME_METRIC]
    : hasBodyweight
      ? [...WEIGHT_METRICS, RELATIVE_METRIC]
      : WEIGHT_METRICS;
  // The stored choice can become invalid when the exercise type changes.
  const activeMetric: Metric = isDuration
    ? "time"
    : metric === "time" || (metric === "relative" && !hasBodyweight)
      ? "e1rm"
      : metric;

  const data = useMemo(() => {
    if (!selected) return [];
    const points: { date: string; value: number }[] = [];
    const asc = [...workouts].sort(
      (a, b) =>
        new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
    );
    for (const w of asc) {
      const sets = w.sets.filter((s) => s.exercise_id === selected && !s.is_warmup);
      if (!sets.length) continue;
      const day = localDay(new Date(w.performed_at));
      let value = 0;
      if (activeMetric === "time") {
        value = Math.max(...sets.map((s) => s.duration_seconds ?? 0));
        if (value <= 0) continue;
      } else if (activeMetric === "relative") {
        const bwKg = bodyweightKgOn(bodyweight, day);
        if (!bwKg) continue;
        const bestKg = Math.max(...sets.map((s) => blendedOneRepMax(toKg(s.weight, s.unit), s.reps)));
        if (bestKg <= 0) continue;
        value = Math.round((bestKg / bwKg) * 100) / 100;
      } else if (activeMetric === "e1rm") {
        value = Math.max(...sets.map((s) => blendedOneRepMax(s.weight, s.reps)));
      } else if (activeMetric === "top") {
        value = Math.max(...sets.map((s) => s.weight));
      } else {
        value = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      }
      points.push({
        date: day,
        value: activeMetric === "relative" ? value : round1(value),
      });
    }
    return points;
  }, [workouts, selected, activeMetric, bodyweight]);

  const exerciseById = useStore((s) => s.exerciseById);

  const muscleSplit = useMemo(() => {
    const totals = volumeByMuscle(workouts, exerciseById);
    const entries = (Object.keys(totals) as MuscleGroup[])
      .map((mg) => ({ mg, vol: totals[mg] }))
      .filter((e) => e.vol > 0)
      .sort((a, b) => b.vol - a.vol);
    const sum = entries.reduce((s, e) => s + e.vol, 0) || 1;
    const max = entries[0]?.vol || 1;
    return entries.map((e, i) => ({
      mg: e.mg,
      label: MUSCLE_LABELS[e.mg],
      pct: Math.round((e.vol / sum) * 100),
      barW: Math.round((e.vol / max) * 100),
      top: i === 0,
    }));
  }, [workouts, exerciseById]);

  const prs = useMemo(() => {
    return PR_LIFTS.map(({ label, names }) => {
      const ids = new Set(exercises.filter((e) => names.includes(e.name)).map((e) => e.id));
      let best = 0;
      if (ids.size > 0) {
        for (const w of workouts) {
          for (const s of w.sets) {
            if (!ids.has(s.exercise_id) || s.is_warmup || !s.completed || s.reps <= 0) continue;
            const orm = estimateOneRepMax(s.weight, s.reps, "epley");
            if (orm > best) best = orm;
          }
        }
      }
      return { label, value: best > 0 ? round1(best) : null };
    });
  }, [workouts, exercises]);

  if (logged.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[32px] font-extrabold tracking-[-0.025em]">Progress</h1>
        <div className="rounded-[28px] border border-line-2 bg-surface p-10 text-center text-ink-soft shadow-[var(--rp-shadow-sm)]">
          Log a few workouts and your progress charts will appear here.
        </div>
      </div>
    );
  }

  const unitLabel =
    activeMetric === "volume"
      ? `${unit}·reps`
      : activeMetric === "relative"
        ? "×BW"
        : activeMetric === "time"
          ? "s"
          : unit;
  const latest = data.length ? data[data.length - 1].value : 0;
  const first = data.length ? data[0].value : 0;
  const diff = Math.round((latest - first) * 100) / 100;
  const metricLabel =
    [...WEIGHT_METRICS, RELATIVE_METRIC, TIME_METRIC].find((m) => m.id === activeMetric)?.label ?? "";
  const deltaSuffix =
    activeMetric === "volume" || activeMetric === "relative"
      ? ""
      : activeMetric === "time"
        ? "s"
        : unit;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[32px] font-extrabold tracking-[-0.025em]">Progress</h1>
        <Pill tone="green">{data.length} POINTS</Pill>
      </div>

      {/* exercise selector — branded row, opens the full picker */}
      <button
        onClick={() => setPicking(true)}
        aria-label="Change exercise"
        className="flex items-center gap-3 rounded-[20px] border border-line-2 bg-surface px-3.5 py-2.5 text-left shadow-[var(--rp-shadow-sm)]"
      >
        <span style={{ color: MUSCLE_COLORS[selectedMeta?.muscle_group ?? "core"] }}>
          <ExerciseIcon
            name={selectedMeta?.name}
            pattern={selectedMeta?.movement_pattern ?? "other"}
            size={30}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">
            {selectedName || "Pick an exercise"}
          </span>
          {selectedMeta && (
            <span className="mt-px block font-mono text-[10px] uppercase text-ink-faint">
              {selectedMeta.equipment} · {MUSCLE_LABELS[selectedMeta.muscle_group]}
            </span>
          )}
        </span>
        <span className="shrink-0 text-ink-faint">
          <Icon name="chevron" size={16} color="currentColor" style={{ transform: "rotate(90deg)" }} />
        </span>
      </button>

      {/* metric chips */}
      <div className="flex gap-2">
        {metricChoices.map((m) => {
          const on = activeMetric === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={[
                "rounded-full px-4 py-2 text-[13px] font-semibold tracking-[-0.01em] transition-colors",
                on ? "border border-ink bg-ink text-bg" : "border border-line bg-surface text-ink-soft",
              ].join(" ")}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* hero chart card */}
      <div className="rounded-[28px] border border-line-2 bg-surface p-[18px] shadow-[var(--rp-shadow-sm)]">
        <Eyebrow>{selectedName ? `${selectedName.toUpperCase()} · ${metricLabel.toUpperCase()}` : metricLabel.toUpperCase()}</Eyebrow>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="text-[36px] font-extrabold leading-none tracking-[-0.03em]">
            {data.length ? latest : "—"}
          </span>
          <span className="font-mono text-[15px] text-ink-faint">{unitLabel}</span>
          {data.length > 1 && diff !== 0 && (
            <span className="ml-auto">
              <Delta value={`${Math.abs(diff)}${deltaSuffix}`} up={diff >= 0} />
            </span>
          )}
        </div>

        {data.length === 0 ? (
          <div className="mt-3.5 flex h-[150px] w-full items-center justify-center text-sm text-ink-faint">
            No logged sets for this exercise yet.
          </div>
        ) : (
        <div className="mt-3.5 h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="rpArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--color-green)" stopOpacity={0.14} />
                  <stop offset="1" stopColor="var(--color-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-line-2)" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-ink-faint)", fontSize: 9.5, fontFamily: "var(--font-mono)" }}
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString("en-US", { month: "short" }).toUpperCase()
                }
                tickLine={false}
                axisLine={false}
                minTickGap={36}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 12,
                  color: "var(--color-ink)",
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="value" stroke="none" fill="url(#rpArea)" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-green)"
                strokeWidth={2.6}
                dot={(props: { key?: React.Key | null; cx?: number; cy?: number; index?: number }) => {
                  const lastPt = props.index === data.length - 1;
                  return (
                    <circle
                      key={props.key ?? props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={lastPt ? 5 : 3.2}
                      fill={lastPt ? "var(--color-amber)" : "var(--color-surface)"}
                      stroke={lastPt ? "var(--color-amber)" : "var(--color-green)"}
                      strokeWidth={2.2}
                    />
                  );
                }}
                activeDot={{ r: 5, fill: "var(--color-amber)", stroke: "var(--color-amber)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* volume by muscle */}
      {muscleSplit.length > 0 && (
        <div className="mt-1">
          <Eyebrow className="mb-3.5 ml-0.5">VOLUME BY MUSCLE</Eyebrow>
          <div className="flex flex-col gap-2.5">
            {muscleSplit.map((m) => (
              <div key={m.mg} className="flex items-center gap-2.5">
                <span className="w-[70px] text-[13px] font-semibold">{m.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.barW}%`, background: MUSCLE_COLORS[m.mg] }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] text-ink-soft">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          onPick={(id) => {
            setExerciseId(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {/* personal records */}
      <div className="mt-3">
        <Eyebrow className="mb-3 ml-0.5">PERSONAL RECORDS</Eyebrow>
        <div className="grid grid-cols-3 gap-2.5">
          {prs.map((p) => (
            <div
              key={p.label}
              className="rounded-[22px] border border-line-2 bg-surface p-3.5 text-center shadow-[var(--rp-shadow-sm)]"
            >
              <div className="rp-eyebrow" style={{ fontSize: 9 }}>{p.label.toUpperCase()}</div>
              <div className="mt-2 flex items-baseline justify-center gap-0.5">
                <span className="text-[21px] font-extrabold tracking-[-0.03em]">{p.value ?? "—"}</span>
                {p.value !== null && <span className="font-mono text-[10px] text-ink-faint">{unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
