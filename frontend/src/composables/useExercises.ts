import { ref } from 'vue'
import { supabase } from './useSupabase'
import type { Exercise } from '@/types/database'

export const EXERCISE_CATEGORIES = [
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'bodyweight', label: 'Bodyweight' },
] as const

export const EQUIPMENT_OPTIONS = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
] as const

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'traps',
  'rear_delts', 'upper_chest', 'lower_back', 'hip_flexors'
] as const

export function useExercises() {
  const exercises = ref<Exercise[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchExercises() {
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('exercises')
      .select('*')
      .order('category')
      .order('name')

    if (err) {
      error.value = err.message
    } else {
      exercises.value = data || []
    }

    loading.value = false
  }

  async function searchExercises(query: string) {
    const { data, error: err } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20)

    if (err) throw err
    return data as Exercise[]
  }

  function groupByCategory(exerciseList: Exercise[]) {
    const groups: Record<string, Exercise[]> = {}

    for (const exercise of exerciseList) {
      if (!groups[exercise.category]) {
        groups[exercise.category] = []
      }
      groups[exercise.category]!.push(exercise)
    }

    return groups
  }

  async function createExercise(exercise: {
    name: string
    category: Exercise['category']
    muscle_groups: string[]
    equipment?: string | null
    description?: string | null
  }) {
    const { data, error: err } = await supabase
      .from('exercises')
      .insert({
        name: exercise.name,
        category: exercise.category,
        muscle_groups: exercise.muscle_groups,
        equipment: exercise.equipment || null,
        description: exercise.description || null
      })
      .select()
      .single()

    if (err) throw err
    return data as Exercise
  }

  async function deleteExercise(id: string) {
    const { error: err } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)

    if (err) throw err
  }

  return {
    exercises,
    loading,
    error,
    fetchExercises,
    searchExercises,
    groupByCategory,
    createExercise,
    deleteExercise
  }
}
