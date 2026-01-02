<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveWorkoutStore } from '@/stores/activeWorkout'
import { useExercises } from '@/composables/useExercises'
import AppLayout from '@/components/layout/AppLayout.vue'
import ExerciseCard from '@/components/workout/ExerciseCard.vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Exercise } from '@/types/database'

const router = useRouter()
const activeWorkout = useActiveWorkoutStore()
const { exercises, fetchExercises, groupByCategory } = useExercises()

const workoutDuration = computed(() => {
  if (!activeWorkout.workout?.started_at) return '0:00'

  const start = new Date(activeWorkout.workout.started_at)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / 1000)

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }
  return `${minutes}:${(diff % 60).toString().padStart(2, '0')}`
})

const volumeDisplay = computed(() => {
  const volume = activeWorkout.totalVolume
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`
  }
  return `${volume.toFixed(0)} kg`
})

const hasIncompleteSets = computed(() => activeWorkout.completedSetsCount < activeWorkout.totalSetsCount)
const showAddExerciseSheet = ref(false)
const exerciseSearch = ref('')
const finishDialogOpen = ref(false)

const filteredExercises = computed(() => {
  const term = exerciseSearch.value.toLowerCase().trim()
  const grouped = groupByCategory(exercises.value)
  if (!term) return grouped

  const filtered: Record<string, Exercise[]> = {}
  for (const [category, list] of Object.entries(grouped)) {
    const matches = list.filter(exercise =>
      exercise.name.toLowerCase().includes(term) ||
      (exercise.description || '').toLowerCase().includes(term)
    )
    if (matches.length > 0) {
      filtered[category] = matches
    }
  }
  return filtered
})

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    compound: 'Compound',
    isolation: 'Isolation',
    bodyweight: 'Bodyweight'
  }
  return labels[category] || category
}

onMounted(async () => {
  await fetchExercises()

  if (!activeWorkout.isActive) {
    await activeWorkout.resumeWorkout()

    if (!activeWorkout.isActive) {
      router.replace('/')
    }
  }
})

async function handleFinish() {
  if (hasIncompleteSets.value) {
    finishDialogOpen.value = true
    return
  }
  await finalizeWorkout()
}

async function finalizeWorkout(skipIncomplete = false) {
  try {
    if (skipIncomplete) {
      await activeWorkout.finishWorkoutEarly()
    } else {
      await activeWorkout.finishWorkout()
    }
    toast.success('Workout completed!')
    router.replace('/history')
  } catch (error) {
    toast.error('Failed to save workout')
    console.error(error)
  }
}

async function handleCancel() {
  try {
    await activeWorkout.cancelWorkout()
    toast.info('Workout cancelled')
    router.replace('/')
  } catch (error) {
    toast.error('Failed to cancel workout')
    console.error(error)
  }
}

async function handleAddExercise(exercise: Exercise) {
  try {
    await activeWorkout.addExerciseToActiveWorkout(exercise)
    toast.success('Exercise added to workout')
    showAddExerciseSheet.value = false
  } catch (error) {
    toast.error('Failed to add exercise')
    console.error(error)
  }
}
</script>

<template>
  <AppLayout :title="activeWorkout.workout?.name || 'Workout'" show-back>
    <template #header-actions>
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button variant="ghost" size="icon">
            <X class="h-5 w-5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
            <AlertDialogAction @click="handleCancel" class="bg-destructive text-destructive-foreground">
              Cancel Workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>

    <div class="space-y-6">
      <!-- Progress Bar -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">
            {{ activeWorkout.completedSetsCount }}/{{ activeWorkout.totalSetsCount }} sets
          </span>
          <span class="text-muted-foreground">{{ volumeDisplay }}</span>
        </div>
        <Progress :model-value="activeWorkout.progress" class="h-2" />
      </div>

      <div class="flex justify-end">
        <Button variant="outline" size="sm" @click="showAddExerciseSheet = true">
          Add Exercise
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="activeWorkout.isLoading" class="space-y-4">
        <Skeleton class="h-40 w-full" />
        <Skeleton class="h-40 w-full" />
      </div>

      <!-- Exercises -->
      <div v-else class="space-y-4">
        <ExerciseCard
          v-for="we in activeWorkout.exercises"
          :key="we.id"
          :workout-exercise="we"
        />
      </div>

      <!-- Finish Button -->
      <div class="sticky bottom-20 pt-4">
        <Button
          class="w-full h-14 text-lg"
          :disabled="activeWorkout.totalSetsCount === 0"
          @click="handleFinish"
        >
          <Check class="h-5 w-5 mr-2" />
          Finish Workout
        </Button>
      </div>
    </div>
  </AppLayout>

  <AlertDialog v-model:open="finishDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Finish workout early?</AlertDialogTitle>
        <AlertDialogDescription>
          Remaining sets will be marked as skipped so you can save your progress.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep Going</AlertDialogCancel>
        <AlertDialogAction @click="finalizeWorkout(true)">
          Finish &amp; Skip Remaining
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Sheet v-model:open="showAddExerciseSheet">
    <SheetContent side="bottom" class="h-[80vh]">
      <SheetHeader>
        <SheetTitle>Add to Workout</SheetTitle>
        <SheetDescription>
          Pick another exercise to slot into this session.
        </SheetDescription>
      </SheetHeader>

      <div class="mt-4 space-y-3">
        <Input
          v-model="exerciseSearch"
          placeholder="Search exercises"
          class="h-10"
        />
        <ScrollArea class="h-[calc(100%-6rem)] pr-1">
          <div class="space-y-6 pb-6">
            <div
              v-for="(categoryExercises, category) in filteredExercises"
              :key="category"
              class="space-y-2"
            >
              <p class="text-xs uppercase text-muted-foreground tracking-wide px-1">
                {{ getCategoryLabel(category) }}
              </p>
              <div class="space-y-1">
                <button
                  v-for="exercise in categoryExercises"
                  :key="exercise.id"
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  @click="handleAddExercise(exercise)"
                >
                  <p class="font-medium">{{ exercise.name }}</p>
                  <p v-if="exercise.description" class="text-sm text-muted-foreground truncate">
                    {{ exercise.description }}
                  </p>
                </button>
              </div>
            </div>

            <p v-if="Object.keys(filteredExercises).length === 0" class="text-center text-sm text-muted-foreground">
              No exercises match that search.
            </p>
          </div>
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
</template>
