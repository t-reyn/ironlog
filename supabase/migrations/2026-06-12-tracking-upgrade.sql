-- Tracking upgrade (2026-06-12): exercise types, drop sets, supersets,
-- body fat %, template rest, pinned exercise notes, readiness check-in,
-- secondary muscles. All statements are additive and idempotent; the same
-- statements live in schema.sql for fresh installs.

-- exercises: tracking type + secondary muscle groups
alter table exercises add column if not exists exercise_type text not null default 'weight_reps' check (exercise_type in ('weight_reps','duration'));
alter table exercises add column if not exists secondary_muscles muscle_group[] not null default '{}';

-- workouts: pre-session readiness check-in (1-5 each)
alter table workouts add column if not exists readiness_sleep smallint check (readiness_sleep between 1 and 5);
alter table workouts add column if not exists readiness_energy smallint check (readiness_energy between 1 and 5);
alter table workouts add column if not exists readiness_soreness smallint check (readiness_soreness between 1 and 5);

-- workout_sets: set type (supersedes is_warmup, which stays dual-written),
-- duration for time-based exercises, superset grouping
alter table workout_sets add column if not exists set_type text not null default 'normal' check (set_type in ('normal','warmup','drop'));
update workout_sets set set_type = 'warmup' where is_warmup and set_type = 'normal';
alter table workout_sets add column if not exists duration_seconds int;
alter table workout_sets add column if not exists superset_group int;

-- template_sets: per-exercise rest override
alter table template_sets add column if not exists rest_seconds int;

-- bodyweight_entries: body fat %
alter table bodyweight_entries add column if not exists body_fat_pct numeric(4,1) check (body_fat_pct > 0 and body_fat_pct < 100);

-- exercise_notes: persistent per-user pinned note on an exercise
create table if not exists exercise_notes (
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
alter table exercise_notes enable row level security;
drop policy if exists exercise_notes_rw on exercise_notes;
create policy exercise_notes_rw on exercise_notes
  using (user_id = auth.uid ()) with check (user_id = auth.uid ());

-- Built-in exercise metadata
update exercises set exercise_type = 'duration'
  where user_id is null and name in ('Plank','Side Plank');

update exercises set secondary_muscles = '{shoulders,arms}'::muscle_group[]
  where user_id is null and name in (
    'Bench Press (Barbell)','Incline Bench Press','Decline Bench Press',
    'Dumbbell Bench Press','Incline Dumbbell Press','Dumbbell Bench Press (Single Arm)',
    'Machine Chest Press','Incline Chest Press (Machine)',
    'Iso-Lateral Machine Horizontal Bench Press','Dips (Chest)');
update exercises set secondary_muscles = '{shoulders,arms,core}'::muscle_group[]
  where user_id is null and name = 'Push Up';
update exercises set secondary_muscles = '{shoulders}'::muscle_group[]
  where user_id is null and name in (
    'Cable Fly','Cable Fly (Single Arm)','Cable Crossover','Incline Cable Fly',
    'Dumbbell Fly','Machine Fly','Pec Deck');
update exercises set secondary_muscles = '{arms}'::muscle_group[]
  where user_id is null and name in (
    'Pull Up','Chin Up','Neutral Grip Pull Up','Lat Pulldown (Cable)',
    'Lat Pulldown (Single Arm)','Assisted Pull Up (Machine)');
update exercises set secondary_muscles = '{arms,shoulders}'::muscle_group[]
  where user_id is null and name in (
    'Barbell Row','Seated Cable Row','Dumbbell Row','T-Bar Row','Pendlay Row',
    'Cable Row (Single Arm)','Chest Supported Row (Machine)','Low Row (Machine)',
    'High Row (Machine)','Machine Row');
update exercises set secondary_muscles = '{legs,core}'::muscle_group[]
  where user_id is null and name = 'Deadlift';
update exercises set secondary_muscles = '{back,core}'::muscle_group[]
  where user_id is null and name in (
    'Sumo Deadlift','Romanian Deadlift','Romanian Deadlift (Single-Leg)','Good Morning');
update exercises set secondary_muscles = '{legs}'::muscle_group[]
  where user_id is null and name in ('Back Extension','Back Extension (Single-Leg)');
update exercises set secondary_muscles = '{arms,chest}'::muscle_group[]
  where user_id is null and name in (
    'Overhead Press (Barbell)','Overhead Press (Single Arm)','Dumbbell Shoulder Press',
    'Machine Shoulder Press','Arnold Press');
update exercises set secondary_muscles = '{back}'::muscle_group[]
  where user_id is null and name in ('Face Pull','Rear Delt Fly');
update exercises set secondary_muscles = '{shoulders}'::muscle_group[]
  where user_id is null and name = 'Rear Delt Fly (Machine)';
update exercises set secondary_muscles = '{back,arms}'::muscle_group[]
  where user_id is null and name = 'Upright Row';
update exercises set secondary_muscles = '{chest,shoulders}'::muscle_group[]
  where user_id is null and name in ('Close Grip Bench Press','Dips (Triceps)');
update exercises set secondary_muscles = '{core}'::muscle_group[]
  where user_id is null and name in (
    'Back Squat','Front Squat','Pause Squat (Barbell)','Box Squat','Goblet Squat',
    'Smith Machine Squat','Pistol Squat','Walking Lunge','Reverse Lunge','Step Up',
    'Bulgarian Split Squat','Bulgarian Split Squat (Barbell)');
update exercises set secondary_muscles = '{shoulders}'::muscle_group[]
  where user_id is null and name in ('Plank','Side Plank');
update exercises set secondary_muscles = '{shoulders,back}'::muscle_group[]
  where user_id is null and name = 'Ab Wheel Rollout';
