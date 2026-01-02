<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHistory } from '@/composables/useHistory'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Calendar, Clock, Trash2, Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Workout, WorkoutExercise } from '@/types/database'

const route = useRoute()
const router = useRouter()
const { fetchWorkoutDetail, deleteWorkout, formatVolume, formatDuration } = useHistory()

const workout = ref<Workout | null>(null)
const loading = ref(true)

const workoutId = computed(() => route.params.id as string)

const workoutDuration = computed(() => {
  if (!workout.value?.started_at || !workout.value?.completed_at) return '-'

  const start = new Date(workout.value.started_at)
  const end = new Date(workout.value.completed_at)
  const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

  return formatDuration(diffSeconds)
})

const workoutDate = computed(() => {
  if (!workout.value?.completed_at) return '-'
  return new Date(workout.value.completed_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

onMounted(async () => {
  try {
    workout.value = await fetchWorkoutDetail(workoutId.value)
  } catch (error) {
    toast.error('Failed to load workout')
    router.replace('/history')
  } finally {
    loading.value = false
  }
})

async function handleDelete() {
  try {
    await deleteWorkout(workoutId.value)
    toast.success('Workout deleted')
    router.replace('/history')
  } catch (error) {
    toast.error('Failed to delete workout')
  }
}

function getExerciseVolume(exercise: WorkoutExercise): number {
  if (!exercise.workout_sets) return 0
  return exercise.workout_sets.reduce((total, set) => {
    if (set.is_completed && set.actual_weight && set.actual_reps) {
      return total + (set.actual_weight * set.actual_reps)
    }
    return total
  }, 0)
}
</script>

<template>
  <AppLayout :title="workout?.name || 'Workout'" show-back>
    <template #header-actions>
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button variant="ghost" size="icon">
            <Trash2 class="h-5 w-5 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workout and all its data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="handleDelete" class="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>

    <div v-else-if="workout" class="space-y-6">
      <!-- Summary Card -->
      <Card>
        <CardContent class="p-4">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-2xl font-bold">{{ formatVolume(workout.total_volume) }}</p>
              <p class="text-xs text-muted-foreground">Total Volume</p>
            </div>
            <div>
              <p class="text-2xl font-bold">{{ workoutDuration }}</p>
              <p class="text-xs text-muted-foreground">Duration</p>
            </div>
            <div>
              <p class="text-2xl font-bold">{{ workout.workout_exercises?.length || 0 }}</p>
              <p class="text-xs text-muted-foreground">Exercises</p>
            </div>
          </div>

          <Separator class="my-4" />

          <div class="flex items-center gap-4 text-sm text-muted-foreground">
            <span class="flex items-center gap-1">
              <Calendar class="h-4 w-4" />
              {{ workoutDate }}
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- Exercises -->
      <div class="space-y-4">
        <Card v-for="exercise in workout.workout_exercises" :key="exercise.id">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg">{{ exercise.exercise?.name }}</CardTitle>
              <Badge variant="secondary">
                {{ formatVolume(getExerciseVolume(exercise)) }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-2">
              <div
                v-for="set in exercise.workout_sets"
                :key="set.id"
                class="flex items-center gap-2 py-2 px-2 rounded-lg"
                :class="{
                  'bg-green-500/10': set.is_completed,
                  'bg-muted/30': !set.is_completed
                }"
              >
                <span class="w-8 text-center font-medium text-muted-foreground">
                  {{ set.set_number }}
                </span>
                <span class="flex-1">
                  <template v-if="set.is_completed">
                    <span class="font-medium">{{ set.actual_weight }} kg</span>
                    <span class="text-muted-foreground mx-1">x</span>
                    <span class="font-medium">{{ set.actual_reps }}</span>
                  </template>
                  <span v-else class="text-muted-foreground">Skipped</span>
                </span>
                <Check v-if="set.is_completed" class="h-4 w-4 text-green-500" />
                <X v-else class="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
