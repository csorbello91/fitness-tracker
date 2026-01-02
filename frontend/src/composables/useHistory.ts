import { ref } from 'vue'
import { supabase } from './useSupabase'
import type { Workout, Run } from '@/types/database'

export function useHistory() {
  const workouts = ref<Workout[]>([])
  const runs = ref<Run[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWorkouts(limit = 50) {
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('workouts')
      .select(`
        *,
        template:workout_templates(name)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (err) {
      error.value = err.message
    } else {
      workouts.value = data || []
    }

    loading.value = false
  }

  async function fetchRuns(limit = 50) {
    const { data, error: err } = await supabase
      .from('runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (err) {
      error.value = err.message
    } else {
      runs.value = data || []
    }
  }

  async function fetchWorkoutDetail(workoutId: string) {
    const { data: workout, error: workoutErr } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single()

    if (workoutErr) throw workoutErr

    const { data: exercises, error: exercisesErr } = await supabase
      .from('workout_exercises')
      .select(`
        *,
        exercise:exercises(*),
        workout_sets(*)
      `)
      .eq('workout_id', workoutId)
      .order('order_index')

    if (exercisesErr) throw exercisesErr

    // Sort sets by set_number
    for (const exercise of exercises || []) {
      if (exercise.workout_sets) {
        exercise.workout_sets.sort((a: { set_number: number }, b: { set_number: number }) => a.set_number - b.set_number)
      }
    }

    return {
      ...workout,
      workout_exercises: exercises
    }
  }

  async function deleteWorkout(workoutId: string) {
    const { error: err } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)

    if (err) throw err
  }

  async function deleteRun(runId: string) {
    const { error: err } = await supabase
      .from('runs')
      .delete()
      .eq('id', runId)

    if (err) throw err
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  function formatPace(paceSecondsPerKm: number): string {
    const minutes = Math.floor(paceSecondsPerKm / 60)
    const seconds = Math.round(paceSecondsPerKm % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
  }

  function formatVolume(volume: number): string {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${volume.toFixed(0)} kg`
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`
    }
    return `${meters} m`
  }

  return {
    workouts,
    runs,
    loading,
    error,
    fetchWorkouts,
    fetchRuns,
    fetchWorkoutDetail,
    deleteWorkout,
    deleteRun,
    formatDuration,
    formatPace,
    formatVolume,
    formatDistance
  }
}
