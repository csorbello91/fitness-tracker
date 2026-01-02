-- Workout Tracker Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Exercises Library (seeded)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'compound', 'isolation', 'bodyweight'
  muscle_groups TEXT[] NOT NULL,
  equipment TEXT, -- 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', null
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);

-- Workout Templates
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workout_type TEXT NOT NULL DEFAULT 'lifting', -- 'lifting', 'running'
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON workout_templates(user_id);

-- Template Exercises (junction table)
CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  default_sets INTEGER DEFAULT 5,
  default_reps INTEGER DEFAULT 5,
  default_weight DECIMAL(6,2),
  rest_seconds INTEGER DEFAULT 180,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_exercises_template ON template_exercises(template_id);

-- Workouts (actual sessions)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  workout_type TEXT NOT NULL DEFAULT 'lifting',
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  total_volume DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, started_at DESC);
CREATE INDEX idx_workouts_status ON workouts(status);

-- Workout Exercises
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);

-- Workout Sets
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  target_weight DECIMAL(6,2),
  target_reps INTEGER,
  actual_weight DECIMAL(6,2),
  actual_reps INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  is_warmup BOOLEAN DEFAULT FALSE,
  rpe DECIMAL(3,1),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sets_exercise ON workout_sets(workout_exercise_id);

-- Runs
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL, -- 'easy', 'tempo', 'speed', 'intervals', 'long', 'recovery', 'race'
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  pace_seconds_per_km INTEGER,
  elevation_gain_meters INTEGER,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  notes TEXT,
  weather TEXT,
  terrain TEXT, -- 'road', 'trail', 'track', 'treadmill'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runs_user ON runs(user_id);
CREATE INDEX idx_runs_user_date ON runs(user_id, started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Exercises are public (read-only for all)
CREATE POLICY "Exercises are viewable by everyone" ON exercises
  FOR SELECT USING (true);

-- Workout Templates
CREATE POLICY "Users can view own templates and system templates" ON workout_templates
  FOR SELECT USING (auth.uid() = user_id OR is_system = TRUE);

CREATE POLICY "Users can insert own templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own templates" ON workout_templates
  FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- Template Exercises
CREATE POLICY "Users can view template exercises for accessible templates" ON template_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE id = template_exercises.template_id
      AND (user_id = auth.uid() OR is_system = TRUE)
    )
  );

CREATE POLICY "Users can insert template exercises for own templates" ON template_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE id = template_exercises.template_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template exercises for own templates" ON template_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE id = template_exercises.template_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template exercises for own templates" ON template_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_templates
      WHERE id = template_exercises.template_id
      AND user_id = auth.uid()
    )
  );

-- Workouts
CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Workout Exercises
CREATE POLICY "Users can view workout exercises for own workouts" ON workout_exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert workout exercises for own workouts" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update workout exercises for own workouts" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete workout exercises for own workouts" ON workout_exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid())
  );

-- Workout Sets
CREATE POLICY "Users can view sets for own workouts" ON workout_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sets for own workouts" ON workout_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sets for own workouts" ON workout_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sets for own workouts" ON workout_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id AND w.user_id = auth.uid()
    )
  );

-- Runs
CREATE POLICY "Users can view own runs" ON runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs" ON runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs" ON runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs" ON runs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SEED DATA: EXERCISES
-- ============================================

-- Compound Lifts (StrongLifts Core)
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Squat', 'compound', ARRAY['quadriceps', 'glutes', 'hamstrings', 'core'], 'barbell', 'Back squat with barbell on upper back'),
('Bench Press', 'compound', ARRAY['chest', 'triceps', 'shoulders'], 'barbell', 'Flat barbell bench press'),
('Barbell Row', 'compound', ARRAY['back', 'biceps', 'rear_delts'], 'barbell', 'Bent over barbell row'),
('Overhead Press', 'compound', ARRAY['shoulders', 'triceps', 'upper_chest'], 'barbell', 'Standing barbell overhead press'),
('Deadlift', 'compound', ARRAY['back', 'glutes', 'hamstrings', 'core'], 'barbell', 'Conventional barbell deadlift');

-- Additional Barbell Exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Front Squat', 'compound', ARRAY['quadriceps', 'core', 'upper_back'], 'barbell', 'Barbell front squat'),
('Romanian Deadlift', 'compound', ARRAY['hamstrings', 'glutes', 'lower_back'], 'barbell', 'Stiff-leg deadlift variation'),
('Incline Bench Press', 'compound', ARRAY['upper_chest', 'shoulders', 'triceps'], 'barbell', 'Incline barbell press'),
('Close Grip Bench Press', 'compound', ARRAY['triceps', 'chest'], 'barbell', 'Narrow grip bench press'),
('Pendlay Row', 'compound', ARRAY['back', 'biceps'], 'barbell', 'Strict barbell row from floor'),
('Sumo Deadlift', 'compound', ARRAY['quadriceps', 'glutes', 'back'], 'barbell', 'Wide stance deadlift'),
('Hip Thrust', 'compound', ARRAY['glutes', 'hamstrings'], 'barbell', 'Barbell hip thrust'),
('Good Morning', 'compound', ARRAY['hamstrings', 'lower_back', 'glutes'], 'barbell', 'Barbell good morning'),
('Pause Squat', 'compound', ARRAY['quadriceps', 'glutes', 'core'], 'barbell', 'Squat with pause at bottom'),
('Push Press', 'compound', ARRAY['shoulders', 'triceps', 'legs'], 'barbell', 'Overhead press with leg drive');

-- Dumbbell Exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Dumbbell Bench Press', 'compound', ARRAY['chest', 'triceps', 'shoulders'], 'dumbbell', 'Flat dumbbell press'),
('Dumbbell Row', 'compound', ARRAY['back', 'biceps'], 'dumbbell', 'Single arm dumbbell row'),
('Dumbbell Shoulder Press', 'compound', ARRAY['shoulders', 'triceps'], 'dumbbell', 'Seated or standing dumbbell press'),
('Goblet Squat', 'compound', ARRAY['quadriceps', 'glutes', 'core'], 'dumbbell', 'Squat holding dumbbell at chest'),
('Dumbbell Lunges', 'compound', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'dumbbell', 'Walking or stationary lunges'),
('Incline Dumbbell Press', 'compound', ARRAY['upper_chest', 'shoulders', 'triceps'], 'dumbbell', 'Incline dumbbell press'),
('Dumbbell Romanian Deadlift', 'compound', ARRAY['hamstrings', 'glutes'], 'dumbbell', 'Dumbbell RDL'),
('Bulgarian Split Squat', 'compound', ARRAY['quadriceps', 'glutes'], 'dumbbell', 'Rear foot elevated split squat'),
('Dumbbell Floor Press', 'compound', ARRAY['chest', 'triceps'], 'dumbbell', 'Dumbbell press lying on floor');

-- Isolation Exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Bicep Curl', 'isolation', ARRAY['biceps'], 'dumbbell', 'Standard bicep curl'),
('Hammer Curl', 'isolation', ARRAY['biceps', 'forearms'], 'dumbbell', 'Neutral grip bicep curl'),
('Tricep Pushdown', 'isolation', ARRAY['triceps'], 'cable', 'Cable tricep pushdown'),
('Skull Crushers', 'isolation', ARRAY['triceps'], 'barbell', 'Lying tricep extension'),
('Lateral Raise', 'isolation', ARRAY['shoulders'], 'dumbbell', 'Side lateral raises'),
('Front Raise', 'isolation', ARRAY['shoulders'], 'dumbbell', 'Front dumbbell raises'),
('Rear Delt Fly', 'isolation', ARRAY['rear_delts'], 'dumbbell', 'Bent over rear delt fly'),
('Face Pull', 'isolation', ARRAY['rear_delts', 'upper_back'], 'cable', 'Cable face pulls'),
('Leg Curl', 'isolation', ARRAY['hamstrings'], 'machine', 'Lying or seated leg curl'),
('Leg Extension', 'isolation', ARRAY['quadriceps'], 'machine', 'Machine leg extension'),
('Calf Raise', 'isolation', ARRAY['calves'], 'machine', 'Standing or seated calf raise'),
('Cable Fly', 'isolation', ARRAY['chest'], 'cable', 'Cable chest fly'),
('Preacher Curl', 'isolation', ARRAY['biceps'], 'dumbbell', 'Bicep curl on preacher bench'),
('Concentration Curl', 'isolation', ARRAY['biceps'], 'dumbbell', 'Seated concentration curl'),
('Tricep Kickback', 'isolation', ARRAY['triceps'], 'dumbbell', 'Dumbbell tricep kickback'),
('Shrugs', 'isolation', ARRAY['traps'], 'dumbbell', 'Dumbbell or barbell shrugs');

-- Bodyweight Exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Pull-up', 'bodyweight', ARRAY['back', 'biceps'], 'bodyweight', 'Overhand grip pull-up'),
('Chin-up', 'bodyweight', ARRAY['back', 'biceps'], 'bodyweight', 'Underhand grip chin-up'),
('Dip', 'bodyweight', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', 'Parallel bar dips'),
('Push-up', 'bodyweight', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', 'Standard push-up'),
('Diamond Push-up', 'bodyweight', ARRAY['triceps', 'chest'], 'bodyweight', 'Close hand push-up'),
('Pike Push-up', 'bodyweight', ARRAY['shoulders', 'triceps'], 'bodyweight', 'Push-up in pike position'),
('Inverted Row', 'bodyweight', ARRAY['back', 'biceps'], 'bodyweight', 'Body row using bar or rings'),
('Plank', 'bodyweight', ARRAY['core'], 'bodyweight', 'Forearm or straight arm plank'),
('Hanging Leg Raise', 'bodyweight', ARRAY['core', 'hip_flexors'], 'bodyweight', 'Hanging from bar, raise legs'),
('Ab Wheel Rollout', 'bodyweight', ARRAY['core'], 'bodyweight', 'Ab wheel or barbell rollout'),
('Muscle-up', 'bodyweight', ARRAY['back', 'chest', 'triceps'], 'bodyweight', 'Pull-up transitioning to dip');

-- Machine Exercises
INSERT INTO exercises (name, category, muscle_groups, equipment, description) VALUES
('Lat Pulldown', 'compound', ARRAY['back', 'biceps'], 'machine', 'Cable lat pulldown'),
('Seated Cable Row', 'compound', ARRAY['back', 'biceps'], 'machine', 'Cable seated row'),
('Chest Press Machine', 'compound', ARRAY['chest', 'triceps'], 'machine', 'Machine chest press'),
('Shoulder Press Machine', 'compound', ARRAY['shoulders', 'triceps'], 'machine', 'Machine shoulder press'),
('Leg Press', 'compound', ARRAY['quadriceps', 'glutes'], 'machine', 'Machine leg press'),
('Hack Squat', 'compound', ARRAY['quadriceps', 'glutes'], 'machine', 'Machine hack squat'),
('Smith Machine Squat', 'compound', ARRAY['quadriceps', 'glutes'], 'machine', 'Squat on smith machine'),
('Cable Crossover', 'isolation', ARRAY['chest'], 'machine', 'Cable chest crossover'),
('Pec Deck', 'isolation', ARRAY['chest'], 'machine', 'Machine pec fly');

-- ============================================
-- SEED DATA: SYSTEM TEMPLATES (StrongLifts 5x5)
-- ============================================

-- Create system templates
INSERT INTO workout_templates (id, user_id, name, description, workout_type, is_system) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'StrongLifts 5x5 - Workout A', 'Squat, Bench Press, Barbell Row - The classic A workout', 'lifting', TRUE),
('00000000-0000-0000-0000-000000000002', NULL, 'StrongLifts 5x5 - Workout B', 'Squat, Overhead Press, Deadlift - The classic B workout', 'lifting', TRUE);

-- Add exercises to Workout A
INSERT INTO template_exercises (template_id, exercise_id, order_index, default_sets, default_reps, default_weight, rest_seconds)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  CASE name
    WHEN 'Squat' THEN 1
    WHEN 'Bench Press' THEN 2
    WHEN 'Barbell Row' THEN 3
  END,
  5,
  5,
  CASE name
    WHEN 'Squat' THEN 20
    WHEN 'Bench Press' THEN 20
    WHEN 'Barbell Row' THEN 30
  END,
  180
FROM exercises
WHERE name IN ('Squat', 'Bench Press', 'Barbell Row');

-- Add exercises to Workout B
INSERT INTO template_exercises (template_id, exercise_id, order_index, default_sets, default_reps, default_weight, rest_seconds)
SELECT
  '00000000-0000-0000-0000-000000000002',
  id,
  CASE name
    WHEN 'Squat' THEN 1
    WHEN 'Overhead Press' THEN 2
    WHEN 'Deadlift' THEN 3
  END,
  CASE name WHEN 'Deadlift' THEN 1 ELSE 5 END,
  5,
  CASE name
    WHEN 'Squat' THEN 20
    WHEN 'Overhead Press' THEN 20
    WHEN 'Deadlift' THEN 40
  END,
  CASE name WHEN 'Deadlift' THEN 300 ELSE 180 END
FROM exercises
WHERE name IN ('Squat', 'Overhead Press', 'Deadlift');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate workout volume
CREATE OR REPLACE FUNCTION calculate_workout_volume(workout_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(actual_weight * actual_reps), 0)
  INTO total
  FROM workout_sets ws
  JOIN workout_exercises we ON we.id = ws.workout_exercise_id
  WHERE we.workout_id = workout_uuid AND ws.is_completed = TRUE;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workout volume on set completion
CREATE OR REPLACE FUNCTION update_workout_volume()
RETURNS TRIGGER AS $$
DECLARE
  workout_uuid UUID;
BEGIN
  SELECT we.workout_id INTO workout_uuid
  FROM workout_exercises we
  WHERE we.id = NEW.workout_exercise_id;

  UPDATE workouts
  SET total_volume = calculate_workout_volume(workout_uuid),
      updated_at = NOW()
  WHERE id = workout_uuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_volume
AFTER INSERT OR UPDATE ON workout_sets
FOR EACH ROW
EXECUTE FUNCTION update_workout_volume();

-- Function to calculate run pace
CREATE OR REPLACE FUNCTION calculate_run_pace()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.distance_meters > 0 THEN
    NEW.pace_seconds_per_km := (NEW.duration_seconds * 1000) / NEW.distance_meters;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_pace
BEFORE INSERT OR UPDATE ON runs
FOR EACH ROW
EXECUTE FUNCTION calculate_run_pace();
