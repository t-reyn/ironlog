import Papa from "papaparse";
import { setTypeOf } from "./types";
import type { Exercise, WorkoutWithSets } from "./types";
import { blendedOneRepMax, round1 } from "./oneRepMax";

// Prefix cells starting with =, +, -, @, tab, or CR with a quote so spreadsheet
// apps don't treat them as formulas. Cheap CSV-injection defence.
function escapeFormula(value: string): string {
  if (!value) return value;
  const c = value.charCodeAt(0);
  if ([0x3d, 0x2b, 0x2d, 0x40, 0x09, 0x0d].includes(c)) return "'" + value;
  return value;
}

const COLUMNS = [
  "Date",
  "Workout",
  "Exercise",
  "Muscle Group",
  "Set",
  "Type",
  "Weight",
  "Reps",
  "Time (s)",
  "Est 1RM",
] as const;

/** Flatten every set into one CSV row. Newest workouts first. */
export function exportWorkoutsToCsv(
  workouts: WorkoutWithSets[],
  exercises: Exercise[],
): string {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const rows: Record<string, string>[] = [];

  for (const w of workouts) {
    const date = w.performed_at.slice(0, 10);
    const sets = [...w.sets].sort((a, b) => a.set_index - b.set_index);
    for (const s of sets) {
      const ex = exById.get(s.exercise_id);
      const type = setTypeOf(s);
      rows.push({
        Date: date,
        Workout: escapeFormula(w.name),
        Exercise: escapeFormula(ex?.name ?? "Unknown"),
        "Muscle Group": ex?.muscle_group ?? "",
        Set: String(s.set_index + 1),
        Type: type === "normal" ? "" : type,
        Weight: String(s.weight),
        Reps: String(s.reps),
        "Time (s)": s.duration_seconds ? String(s.duration_seconds) : "",
        "Est 1RM": type === "warmup" ? "" : String(round1(blendedOneRepMax(s.weight, s.reps))),
      });
    }
  }

  return Papa.unparse(rows, { columns: COLUMNS as unknown as string[] });
}

/** Trigger a browser download of CSV text with a UTF-8 BOM (Excel-friendly). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
