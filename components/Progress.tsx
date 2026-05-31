"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { blendedOneRepMax, round1 } from "@/lib/oneRepMax";
import { localDay } from "@/lib/stats";

type Metric = "e1rm" | "top" | "volume";

const METRICS: { id: Metric; label: string }[] = [
  { id: "e1rm", label: "Est. 1RM" },
  { id: "top", label: "Top set" },
  { id: "volume", label: "Volume" },
];

export function Progress() {
  const workouts = useStore((s) => s.workouts);
  const exercises = useStore((s) => s.exercises);
  const unit = useStore((s) => s.profile?.unit ?? "kg");

  // Exercises that actually appear in logged workouts.
  const logged = useMemo(() => {
    const ids = new Set<string>();
    workouts.forEach((w) => w.sets.forEach((s) => ids.add(s.exercise_id)));
    return exercises
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts, exercises]);

  const [exerciseId, setExerciseId] = useState<string>("");
  const [metric, setMetric] = useState<Metric>("e1rm");

  const selected = exerciseId || logged[0]?.id || "";

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
      let value = 0;
      if (metric === "e1rm") {
        value = Math.max(...sets.map((s) => blendedOneRepMax(s.weight, s.reps)));
      } else if (metric === "top") {
        value = Math.max(...sets.map((s) => s.weight));
      } else {
        value = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      }
      points.push({ date: localDay(new Date(w.performed_at)), value: round1(value) });
    }
    return points;
  }, [workouts, selected, metric]);

  if (logged.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface/60 p-10 text-center text-ink-soft">
        Log a few workouts and your progress charts will appear here.
      </div>
    );
  }

  const unitLabel = metric === "volume" ? `${unit}·reps` : unit;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={selected}
          onChange={(e) => setExerciseId(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2"
        >
          {logged.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={[
                "rounded-md px-3 py-1 text-sm",
                metric === m.id ? "bg-ember text-night" : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface/70 p-3">
        <p className="mb-2 text-xs text-ink-faint">
          {METRICS.find((m) => m.id === metric)?.label} over time ({unitLabel})
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }} width={44} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 8,
                  color: "var(--color-ink)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-ember)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-ember)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
