// Database types for Supabase tables

export interface Exercise {
  id: string
  name: string
  category: 'compound' | 'isolation' | 'bodyweight'
  muscle_groups: string[]
  equipment: string | null
  description: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string | null
  name: string
  description: string | null
  workout_type: 'lifting' | 'running'
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  order_index: number
  default_sets: number
  default_reps: number
  default_weight: number | null
  rest_seconds: number
  notes: string | null
  created_at: string
  // Joined data
  exercise?: Exercise
}

export interface Workout {
  id: string
  user_id: string
  template_id: string | null
  workout_type: 'lifting' | 'running'
  name: string
  status: 'in_progress' | 'completed' | 'cancelled'
  started_at: string
  completed_at: string | null
  notes: string | null
  total_volume: number
  created_at: string
  updated_at: string
  // Joined data
  template?: WorkoutTemplate
  workout_exercises?: WorkoutExercise[]
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  order_index: number
  notes: string | null
  created_at: string
  // Joined data
  exercise?: Exercise
  workout_sets?: WorkoutSet[]
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  target_weight: number | null
  target_reps: number | null
  actual_weight: number | null
  actual_reps: number | null
  is_completed: boolean
  is_warmup: boolean
  rpe: number | null
  notes: string | null
  completed_at: string | null
  created_at: string
}

export interface Run {
  id: string
  user_id: string
  run_type: 'easy' | 'tempo' | 'speed' | 'intervals' | 'long' | 'recovery' | 'race'
  distance_meters: number
  duration_seconds: number
  pace_seconds_per_km: number | null
  elevation_gain_meters: number | null
  heart_rate_avg: number | null
  heart_rate_max: number | null
  notes: string | null
  weather: string | null
  terrain: 'road' | 'trail' | 'track' | 'treadmill' | null
  started_at: string
  completed_at: string | null
  created_at: string
}

// Utility types for inserts/updates
export type ExerciseInsert = Omit<Exercise, 'id' | 'created_at'>
export type WorkoutTemplateInsert = Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>
export type TemplateExerciseInsert = Omit<TemplateExercise, 'id' | 'created_at' | 'exercise'>
export type WorkoutInsert = Omit<Workout, 'id' | 'created_at' | 'updated_at' | 'template' | 'workout_exercises'>
export type WorkoutExerciseInsert = Omit<WorkoutExercise, 'id' | 'created_at' | 'exercise' | 'workout_sets'>
export type WorkoutSetInsert = Omit<WorkoutSet, 'id' | 'created_at'>

// RunInsert: required fields for creating a run
export interface RunInsert {
  run_type: Run['run_type']
  distance_meters: number
  duration_seconds: number
  started_at: string
  notes?: string | null
  weather?: string | null
  terrain?: Run['terrain'] | null
  elevation_gain_meters?: number | null
  heart_rate_avg?: number | null
  heart_rate_max?: number | null
  completed_at?: string | null
}
