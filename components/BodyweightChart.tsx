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
import { upsertBodyweight, deleteBodyweight } from "@/lib/db";

type Series = "weight" | "fat";

export function BodyweightChart() {
  const entries = useStore((s) => s.bodyweight);
  const refresh = useStore((s) => s.refreshBodyweight);
  const unit = useStore((s) => s.profile?.unit ?? "kg");
  const [value, setValue] = useState("");
  const [fatValue, setFatValue] = useState("");
  const [series, setSeries] = useState<Series>("weight");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await deleteBodyweight(id);
      await refresh();
    } finally {
      setDeleting(null);
    }
  }

  const hasFat = useMemo(() => entries.some((e) => e.body_fat_pct != null), [entries]);
  const shown = hasFat ? series : "weight";

  const data = useMemo(() => {
    if (shown === "fat") {
      return entries
        .filter((e) => e.body_fat_pct != null)
        .map((e) => ({ date: e.logged_on, value: e.body_fat_pct as number }));
    }
    return entries.map((e) => ({ date: e.logged_on, value: e.weight }));
  }, [entries, shown]);

  const latest = entries[entries.length - 1];

  async function add() {
    const w = parseFloat(value);
    const fat = parseFloat(fatValue);
    const hasWeight = w > 0;
    const fatOk = fat > 0 && fat < 100;
    if (!hasWeight && !fatOk) return;
    setBusy(true);
    try {
      // Logging fat alone re-uses the latest weight so the upsert stays valid.
      const weightToLog = hasWeight ? w : latest?.weight;
      if (!weightToLog) return;
      await upsertBodyweight(weightToLog, unit, fatOk ? fat : null);
      await refresh();
      setValue("");
      setFatValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft">
          {latest != null ? (
            <>
              Latest: <span className="text-ink">{latest.weight} {unit}</span>
              {latest.body_fat_pct != null && (
                <span className="text-ink-faint"> · {latest.body_fat_pct}% BF</span>
              )}
            </>
          ) : (
            "No entries yet"
          )}
        </span>
        <div className="ml-auto flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Today (${unit})`}
            aria-label={`Body weight in ${unit}`}
            className="w-24 rounded-md border border-line bg-night px-2 py-1 text-right outline-none focus:border-ember"
          />
          <input
            type="number"
            inputMode="decimal"
            value={fatValue}
            onChange={(e) => setFatValue(e.target.value)}
            placeholder="BF %"
            aria-label="Body fat percentage"
            className="w-16 rounded-md border border-line bg-night px-2 py-1 text-right outline-none focus:border-ember"
          />
          <button
            onClick={add}
            disabled={busy}
            className="rounded-md bg-ember px-3 py-1 text-sm font-medium text-on-accent disabled:opacity-60"
          >
            Log
          </button>
        </div>
      </div>

      {hasFat && (
        <div className="mb-3 flex gap-1.5">
          {([
            { id: "weight", label: `Weight (${unit})` },
            { id: "fat", label: "Body fat %" },
          ] as { id: Series; label: string }[]).map((s) => (
            <button
              key={s.id}
              onClick={() => setSeries(s.id)}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                shown === s.id
                  ? "border border-ink bg-ink text-bg"
                  : "border border-line bg-surface text-ink-soft",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {data.length > 0 ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fill: "var(--color-ink-faint)", fontSize: 11 }}
                width={40}
              />
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
                name={shown === "fat" ? "Body fat %" : `Weight (${unit})`}
                stroke="var(--color-steel)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-steel)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-ink-faint">
          {shown === "fat" ? "Log a body-fat % to see the trend." : "Log your weight to see the trend."}
        </p>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 max-h-40 overflow-y-auto">
          {[...entries].reverse().map((e) => (
            <li key={e.id} className="flex items-center justify-between border-t border-line py-1.5 text-sm">
              <span className="text-ink-faint">{e.logged_on}</span>
              <span className="text-ink">
                {e.weight} {unit}
                {e.body_fat_pct != null && (
                  <span className="text-ink-faint"> · {e.body_fat_pct}%</span>
                )}
              </span>
              <button
                onClick={() => remove(e.id)}
                disabled={deleting === e.id}
                className="ml-4 text-ink-faint hover:text-ember-soft disabled:opacity-40"
                title="Delete entry"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
