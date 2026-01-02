import { ref } from 'vue'
import { supabase } from './useSupabase'
import type { Run, RunInsert } from '@/types/database'

export const RUN_TYPES = [
  { value: 'easy', label: 'Easy Run', description: 'Conversational pace' },
  { value: 'tempo', label: 'Tempo Run', description: 'Comfortably hard' },
  { value: 'speed', label: 'Speed Work', description: 'Fast intervals' },
  { value: 'intervals', label: 'Intervals', description: 'Work/rest cycles' },
  { value: 'long', label: 'Long Run', description: 'Extended distance' },
  { value: 'recovery', label: 'Recovery', description: 'Very easy pace' },
  { value: 'race', label: 'Race', description: 'Competition' },
] as const

export type RunType = typeof RUN_TYPES[number]['value']

export function useRuns() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createRun(run: RunInsert) {
    loading.value = true
    error.value = null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error: err } = await supabase
      .from('runs')
      .insert({
        ...run,
        user_id: user.id,
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (err) {
      error.value = err.message
      throw err
    }

    loading.value = false
    return data as Run
  }

  async function updateRun(id: string, updates: Partial<RunInsert>) {
    const { data, error: err } = await supabase
      .from('runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (err) throw err
    return data as Run
  }

  async function getRun(id: string) {
    const { data, error: err } = await supabase
      .from('runs')
      .select('*')
      .eq('id', id)
      .single()

    if (err) throw err
    return data as Run
  }

  async function deleteRun(id: string) {
    const { error: err } = await supabase
      .from('runs')
      .delete()
      .eq('id', id)

    if (err) throw err
  }

  function formatPace(paceSecondsPerKm: number): string {
    const minutes = Math.floor(paceSecondsPerKm / 60)
    const seconds = Math.round(paceSecondsPerKm % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function calculatePace(distanceMeters: number, durationSeconds: number): number {
    if (distanceMeters === 0) return 0
    return (durationSeconds * 1000) / distanceMeters
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  function parseDuration(input: string): number {
    // Parse formats like "30:00", "1:30:00", "30"
    const parts = input.split(':').map(Number)

    if (parts.some(isNaN)) return 0

    if (parts.length === 1) {
      return (parts[0] ?? 0) * 60 // Assume minutes
    }
    if (parts.length === 2) {
      return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
    }
    if (parts.length === 3) {
      return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
    }

    return 0
  }

  return {
    loading,
    error,
    createRun,
    updateRun,
    getRun,
    deleteRun,
    formatPace,
    calculatePace,
    formatDuration,
    parseDuration,
    RUN_TYPES
  }
}
