import type { MovementPattern } from "./types";

// One icon per movement *pattern*, not per exercise — variants (single-arm,
// machine, cable, incline/decline) reuse a base pattern's icon. The drawings
// live in components/ExerciseIcon.tsx; this module only resolves a name/pattern
// to an icon key.
export type IconKey =
  | "bench"
  | "inclineBench"
  | "dbPress"
  | "fly"
  | "pushup"
  | "dip"
  | "machinePress"
  | "deadlift"
  | "row"
  | "pulldown"
  | "pullup"
  | "seatedRow"
  | "backExt"
  | "squat"
  | "frontSquat"
  | "lunge"
  | "legPress"
  | "legCurl"
  | "legExt"
  | "hipThrust"
  | "calfRaise"
  | "rdl"
  | "hipAbd"
  | "ohp"
  | "lateralRaise"
  | "frontRaise"
  | "facePull"
  | "uprightRow"
  | "curl"
  | "preacher"
  | "pushdown"
  | "tricepExt"
  | "skullcrusher"
  | "plank"
  | "sidePlank"
  | "crunch"
  | "legRaise"
  | "abWheel"
  | "russianTwist"
  | "pallof";

// Exercise name → icon key. Source of truth for the built-in library (names
// match the seeds in supabase/schema.sql). Keyed by lowercased name.
const NAME_ICONS: Record<string, IconKey> = {
  // Chest
  "bench press (barbell)": "bench",
  "cable crossover": "fly",
  "cable fly": "fly",
  "cable fly (single arm)": "fly",
  "decline bench press": "bench",
  "dips (chest)": "dip",
  "dumbbell bench press": "dbPress",
  "dumbbell bench press (single arm)": "dbPress",
  "dumbbell fly": "fly",
  "incline bench press": "inclineBench",
  "incline cable fly": "fly",
  "incline chest press (machine)": "machinePress",
  "incline dumbbell press": "inclineBench",
  "iso-lateral machine horizontal bench press": "machinePress",
  "machine chest press": "machinePress",
  "machine fly": "fly",
  "pec deck": "fly",
  "push up": "pushup",
  // Back
  "assisted pull up (machine)": "pullup",
  "back extension": "backExt",
  "back extension (single-leg)": "backExt",
  "barbell row": "row",
  "cable row (single arm)": "seatedRow",
  "chest supported row (machine)": "row",
  "chin up": "pullup",
  "deadlift": "deadlift",
  "dumbbell row": "row",
  "high row (machine)": "row",
  "lat pulldown (cable)": "pulldown",
  "lat pulldown (single arm)": "pulldown",
  "low row (machine)": "seatedRow",
  "machine row": "row",
  "neutral grip pull up": "pullup",
  "pendlay row": "row",
  "pull up": "pullup",
  "rear delt fly (machine)": "fly",
  "seated cable row": "seatedRow",
  "straight arm pulldown": "pulldown",
  "t-bar row": "row",
  // Legs
  "back squat": "squat",
  "box squat": "squat",
  "bulgarian split squat": "lunge",
  "bulgarian split squat (barbell)": "lunge",
  "front squat": "frontSquat",
  "glute bridge": "hipThrust",
  "glute bridge (single leg)": "hipThrust",
  "glute kickback (machine)": "hipThrust",
  "goblet squat": "frontSquat",
  "good morning": "rdl",
  "hack squat": "legPress",
  "hip abduction (machine)": "hipAbd",
  "hip adduction (machine)": "hipAbd",
  "hip thrust": "hipThrust",
  "hip thrust (machine)": "hipThrust",
  "hip thrust (single leg)": "hipThrust",
  "leg curl": "legCurl",
  "leg curl (single leg)": "legCurl",
  "leg extension": "legExt",
  "leg extension (single leg)": "legExt",
  "leg press": "legPress",
  "leg press (single-leg)": "legPress",
  "nordic curl": "legCurl",
  "pause squat (barbell)": "squat",
  "pistol squat": "lunge",
  "reverse lunge": "lunge",
  "romanian deadlift": "rdl",
  "romanian deadlift (single-leg)": "rdl",
  "seated calf raise": "calfRaise",
  "smith machine squat": "squat",
  "standing calf raise": "calfRaise",
  "standing calf raise (single-leg)": "calfRaise",
  "step up": "lunge",
  "sumo deadlift": "deadlift",
  "walking lunge": "lunge",
  // Shoulders
  "arnold press": "ohp",
  "cable lateral raise (single arm)": "lateralRaise",
  "dumbbell shoulder press": "ohp",
  "face pull": "facePull",
  "front raise": "frontRaise",
  "lateral raise": "lateralRaise",
  "machine lateral raise": "lateralRaise",
  "machine shoulder press": "ohp",
  "overhead press (barbell)": "ohp",
  "overhead press (single arm)": "ohp",
  "rear delt fly": "fly",
  "upright row": "uprightRow",
  // Arms
  "barbell curl": "curl",
  "bicep curl (machine)": "curl",
  "cable curl": "curl",
  "cable curl (single arm)": "curl",
  "cable overhead triceps extension": "tricepExt",
  "close grip bench press": "bench",
  "concentration curl": "curl",
  "dips (triceps)": "dip",
  "dumbbell curl": "curl",
  "ez bar curl": "curl",
  "hammer curl": "curl",
  "incline dumbbell curl": "curl",
  "overhead triceps extension": "tricepExt",
  "preacher curl": "preacher",
  "preacher curl (machine)": "preacher",
  "skullcrusher": "skullcrusher",
  "tricep extension (machine)": "tricepExt",
  "triceps pushdown": "pushdown",
  "triceps pushdown (single arm)": "pushdown",
  // Core
  "ab wheel rollout": "abWheel",
  "abdominal crunch (machine)": "crunch",
  "cable crunch": "crunch",
  "dead bug": "crunch",
  "decline sit up": "crunch",
  "hanging leg raise": "legRaise",
  "pallof press": "pallof",
  "plank": "plank",
  "russian twist": "russianTwist",
  "side plank": "sidePlank",
};

// Fallback for custom exercises (and any unmapped name): pick a representative
// icon from the movement pattern.
const PATTERN_ICONS: Record<MovementPattern, IconKey> = {
  squat: "squat",
  hinge: "deadlift",
  lunge: "lunge",
  horizontal_press: "bench",
  vertical_press: "ohp",
  horizontal_pull: "row",
  vertical_pull: "pulldown",
  curl: "curl",
  triceps_extension: "pushdown",
  core: "crunch",
  calf: "calfRaise",
  other: "bench",
};

/** Resolve the movement icon for an exercise: exact name match first, then a
 *  per-movement-pattern fallback, then `bench` as a last resort. */
export function iconForExercise(ex?: {
  name?: string | null;
  movement_pattern?: MovementPattern | null;
} | null): IconKey {
  if (!ex) return "bench";
  const byName = ex.name ? NAME_ICONS[ex.name.trim().toLowerCase()] : undefined;
  if (byName) return byName;
  if (ex.movement_pattern) return PATTERN_ICONS[ex.movement_pattern] ?? "bench";
  return "bench";
}
