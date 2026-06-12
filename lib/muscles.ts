import type { Exercise, MuscleGroup, MovementPattern, WorkoutWithSets } from "./types";

/** How much a set's volume counts toward each *secondary* muscle group in the
 *  split analytics (primary counts at 1.0). */
export const SECONDARY_MUSCLE_WEIGHT = 0.5;

export type MuscleLookup = (
  exerciseId: string,
) => Pick<Exercise, "muscle_group" | "secondary_muscles"> | undefined;

export function addWeightedVolume(
  totals: Record<MuscleGroup, number>,
  ex: Pick<Exercise, "muscle_group" | "secondary_muscles">,
  volume: number,
): void {
  totals[ex.muscle_group] += volume;
  for (const mg of ex.secondary_muscles ?? []) {
    if (mg === ex.muscle_group) continue;
    totals[mg] += volume * SECONDARY_MUSCLE_WEIGHT;
  }
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
};

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: "var(--color-mg-chest)",
  back: "var(--color-mg-back)",
  legs: "var(--color-mg-legs)",
  shoulders: "var(--color-mg-shoulders)",
  arms: "var(--color-mg-arms)",
  core: "var(--color-mg-core)",
};

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  horizontal_press: "Horizontal Press",
  vertical_press: "Vertical Press",
  horizontal_pull: "Horizontal Pull",
  vertical_pull: "Vertical Pull",
  curl: "Curl",
  triceps_extension: "Triceps Extension",
  core: "Core",
  calf: "Calf",
  other: "Other",
};

/** Volume (weight x reps) summed by muscle group over the given workouts.
 *  Secondary muscle groups accrue at SECONDARY_MUSCLE_WEIGHT. */
export function volumeByMuscle(
  workouts: WorkoutWithSets[],
  exerciseOf: MuscleLookup,
): Record<MuscleGroup, number> {
  const totals: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
  };
  for (const w of workouts) {
    for (const s of w.sets) {
      const ex = exerciseOf(s.exercise_id);
      if (!ex || s.is_warmup) continue;
      addWeightedVolume(totals, ex, s.weight * s.reps);
    }
  }
  return totals;
}
