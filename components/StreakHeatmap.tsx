"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { buildHeatmap, type HeatCell } from "@/lib/stats";

const LEVEL_VAR: Record<HeatCell["level"], string> = {
  0: "var(--color-heat-0)",
  1: "var(--color-heat-1)",
  2: "var(--color-heat-2)",
  3: "var(--color-heat-3)",
  4: "var(--color-heat-4)",
};

export function StreakHeatmap() {
  const workouts = useStore((s) => s.workouts);
  const { weeks } = useMemo(() => buildHeatmap(workouts, 26), [workouts]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.date}
                title={
                  cell.count > 0
                    ? `${cell.date}: ${cell.count} workout(s), ${Math.round(cell.volume)} volume`
                    : `${cell.date}: rest`
                }
                className="h-3 w-3 rounded-[3px]"
                style={{
                  backgroundColor: cell.inFuture
                    ? "transparent"
                    : LEVEL_VAR[cell.level],
                  opacity: cell.inFuture ? 0.15 : 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-ink-faint">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((l) => (
          <span
            key={l}
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: LEVEL_VAR[l] }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
