export type OrmFormula = "epley" | "brzycki" | "lombardi";

export const ORM_FORMULA_LABELS: Record<OrmFormula, string> = {
  epley: "Epley",
  brzycki: "Brzycki",
  lombardi: "Lombardi",
};

/** Estimate a one-rep max from a weight x reps set.
 *  reps === 1 returns the weight; reps <= 0 returns 0. Brzycki is undefined at
 *  37 reps (divide by zero) and unreliable past ~12 reps for all formulas. */
export function estimateOneRepMax(
  weight: number,
  reps: number,
  formula: OrmFormula = "epley",
): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  switch (formula) {
    case "epley":
      return weight * (1 + reps / 30);
    case "brzycki":
      if (reps >= 37) return 0;
      return weight * (36 / (37 - reps));
    case "lombardi":
      return weight * Math.pow(reps, 0.1);
  }
}

/** Average of the three formulas — a steadier estimate for charts. */
export function blendedOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  const fs: OrmFormula[] = ["epley", "brzycki", "lombardi"];
  const vals = fs
    .map((f) => estimateOneRepMax(weight, reps, f))
    .filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
