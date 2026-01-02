import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { Workout, WorkoutExercise, WorkoutSet, TemplateExercise } from '@/types/database'

export const useActiveWorkoutStore = defineStore('activeWorkout', () => {
  // State
  const workout = ref<Workout | null>(null)
  const exercises = ref<WorkoutExercise[]>([])
  const sets = ref<Map<string, WorkoutSet[]>>(new Map())
  const previousData = ref<Map<string, WorkoutSet[]>>(new Map())
  const isLoading = ref(false)

  // Getters
  const isActive = computed(() => workout.value !== null && workout.value.status === 'in_progress')

  const totalVolume = computed(() => {
    let volume = 0
    sets.value.forEach((exerciseSets) => {
      exerciseSets.forEach((set) => {
        if (set.is_completed && set.actual_weight && set.actual_reps) {
          volume += set.actual_weight * set.actual_reps
        }
      })
    })
    return volume
  })

  const completedSetsCount = computed(() => {
    let count = 0
    sets.value.forEach((exerciseSets) => {
      count += exerciseSets.filter(s => s.is_completed).length
    })
    return count
  })

  const totalSetsCount = computed(() => {
    let count = 0
    sets.value.forEach((exerciseSets) => {
      count += exerciseSets.length
    })
    return count
  })

  const progress = computed(() => {
    if (totalSetsCount.value === 0) return 0
    return Math.round((completedSetsCount.value / totalSetsCount.value) * 100)
  })

  // Actions
  async function startWorkoutFromTemplate(templateId: string) {
    isLoading.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch template with exercises
      const { data: template } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (!template) throw new Error('Template not found')

      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('template_id', templateId)
        .order('order_index')

      // Create workout
      const { data: newWorkout, error: workoutErr } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          template_id: templateId,
          workout_type: 'lifting',
          name: template.name,
          status: 'in_progress'
        })
        .select()
        .single()

      if (workoutErr) throw workoutErr

      workout.value = newWorkout

      // Create workout exercises and sets
      for (const te of templateExercises as TemplateExercise[]) {
        const { data: we } = await supabase
          .from('workout_exercises')
          .insert({
            workout_id: newWorkout.id,
            exercise_id: te.exercise_id,
            order_index: te.order_index
          })
          .select(`
            *,
            exercise:exercises(*)
          `)
          .single()

        if (we) {
          exercises.value.push(we as WorkoutExercise)

          // Get previous workout data for this exercise
          const prevSets = await fetchPreviousSets(te.exercise_id, user.id)
          previousData.value.set(we.id, prevSets)

          // Create sets based on template defaults
          const newSets: WorkoutSet[] = []
          for (let i = 1; i <= te.default_sets; i++) {
            const prevSet = prevSets[i - 1]

            const { data: setData } = await supabase
              .from('workout_sets')
              .insert({
                workout_exercise_id: we.id,
                set_number: i,
                target_weight: prevSet?.actual_weight ?? te.default_weight,
                target_reps: prevSet?.actual_reps ?? te.default_reps,
                is_completed: false
              })
              .select()
              .single()

            if (setData) {
              newSets.push(setData)
            }
          }
          sets.value.set(we.id, newSets)
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPreviousSets(exerciseId: string, userId: string): Promise<WorkoutSet[]> {
    // Get the most recent completed workout with this exercise
    const { data } = await supabase
      .from('workout_sets')
      .select(`
        *,
        workout_exercise:workout_exercises!inner(
          exercise_id,
          workout:workouts!inner(
            user_id,
            status,
            completed_at
          )
        )
      `)
      .eq('workout_exercise.exercise_id', exerciseId)
      .eq('workout_exercise.workout.user_id', userId)
      .eq('workout_exercise.workout.status', 'completed')
      .eq('is_completed', true)
      .order('workout_exercise(workout(completed_at))', { ascending: false })
      .limit(10)

    return (data || []) as WorkoutSet[]
  }

  async function completeSet(workoutExerciseId: string, setId: string, weight: number, reps: number) {
    const { data, error } = await supabase
      .from('workout_sets')
      .update({
        actual_weight: weight,
        actual_reps: reps,
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', setId)
      .select()
      .single()

    if (error) throw error

    // Update local state
    const exerciseSets = sets.value.get(workoutExerciseId)
    if (exerciseSets) {
      const index = exerciseSets.findIndex(s => s.id === setId)
      if (index !== -1) {
        exerciseSets[index] = data
      }
    }
  }

  async function confirmSameAsLast(workoutExerciseId: string, setId: string) {
    const exerciseSets = sets.value.get(workoutExerciseId)
    const set = exerciseSets?.find(s => s.id === setId)

    if (set) {
      await completeSet(
        workoutExerciseId,
        setId,
        set.target_weight || 0,
        set.target_reps || 0
      )
    }
  }

  async function finishWorkout() {
    if (!workout.value) return

    const { error } = await supabase
      .from('workouts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_volume: totalVolume.value
      })
      .eq('id', workout.value.id)

    if (error) throw error

    // Clear state
    workout.value = null
    exercises.value = []
    sets.value.clear()
    previousData.value.clear()
  }

  async function cancelWorkout() {
    if (!workout.value) return

    const { error } = await supabase
      .from('workouts')
      .update({
        status: 'cancelled'
      })
      .eq('id', workout.value.id)

    if (error) throw error

    // Clear state
    workout.value = null
    exercises.value = []
    sets.value.clear()
    previousData.value.clear()
  }

  async function resumeWorkout() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check for in-progress workout
    const { data: inProgressWorkout } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (!inProgressWorkout) return

    workout.value = inProgressWorkout

    // Fetch exercises
    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`
        *,
        exercise:exercises(*)
      `)
      .eq('workout_id', inProgressWorkout.id)
      .order('order_index')

    exercises.value = (workoutExercises || []) as WorkoutExercise[]

    // Fetch sets for each exercise
    for (const we of exercises.value) {
      const { data: exerciseSets } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('workout_exercise_id', we.id)
        .order('set_number')

      sets.value.set(we.id, exerciseSets || [])

      // Get previous data
      const prevSets = await fetchPreviousSets(we.exercise_id, user.id)
      previousData.value.set(we.id, prevSets)
    }
  }

  function getSetsForExercise(workoutExerciseId: string): WorkoutSet[] {
    return sets.value.get(workoutExerciseId) || []
  }

  function getPreviousSetsForExercise(workoutExerciseId: string): WorkoutSet[] {
    return previousData.value.get(workoutExerciseId) || []
  }

  return {
    workout,
    exercises,
    sets,
    previousData,
    isLoading,
    isActive,
    totalVolume,
    completedSetsCount,
    totalSetsCount,
    progress,
    startWorkoutFromTemplate,
    completeSet,
    confirmSameAsLast,
    finishWorkout,
    cancelWorkout,
    resumeWorkout,
    getSetsForExercise,
    getPreviousSetsForExercise
  }
})
