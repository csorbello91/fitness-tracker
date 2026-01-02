import { ref } from 'vue'
import { supabase } from './useSupabase'
import type { WorkoutTemplate, TemplateExercise } from '@/types/database'

export function useTemplates() {
  const templates = ref<WorkoutTemplate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTemplates() {
    loading.value = true
    error.value = null

    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    if (err) {
      error.value = err.message
    } else {
      templates.value = data || []
    }

    loading.value = false
  }

  async function fetchTemplateWithExercises(templateId: string) {
    const { data: template, error: templateErr } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateErr) throw templateErr

    const { data: exercises, error: exercisesErr } = await supabase
      .from('template_exercises')
      .select(`
        *,
        exercise:exercises(*)
      `)
      .eq('template_id', templateId)
      .order('order_index')

    if (exercisesErr) throw exercisesErr

    return {
      ...template,
      template_exercises: exercises as TemplateExercise[]
    }
  }

  async function createTemplate(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: err } = await supabase
      .from('workout_templates')
      .insert({
        user_id: user.id,
        name,
        description,
        workout_type: 'lifting'
      })
      .select()
      .single()

    if (err) throw err
    return data
  }

  async function updateTemplate(id: string, updates: Partial<WorkoutTemplate>) {
    const { data, error: err } = await supabase
      .from('workout_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    return data
  }

  async function deleteTemplate(id: string) {
    const { error: err } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', id)

    if (err) throw err
  }

  async function addExerciseToTemplate(
    templateId: string,
    exerciseId: string,
    orderIndex: number,
    defaults?: { sets?: number; reps?: number; weight?: number }
  ) {
    const { data, error: err } = await supabase
      .from('template_exercises')
      .insert({
        template_id: templateId,
        exercise_id: exerciseId,
        order_index: orderIndex,
        default_sets: defaults?.sets ?? 5,
        default_reps: defaults?.reps ?? 5,
        default_weight: defaults?.weight ?? null
      })
      .select(`
        *,
        exercise:exercises(*)
      `)
      .single()

    if (err) throw err
    return data as TemplateExercise
  }

  async function removeExerciseFromTemplate(templateExerciseId: string) {
    const { error: err } = await supabase
      .from('template_exercises')
      .delete()
      .eq('id', templateExerciseId)

    if (err) throw err
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    fetchTemplateWithExercises,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addExerciseToTemplate,
    removeExerciseFromTemplate
  }
}
