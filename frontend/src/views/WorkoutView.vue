<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveWorkoutStore } from '@/stores/activeWorkout'
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
import { Check, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const router = useRouter()
const activeWorkout = useActiveWorkoutStore()

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

onMounted(async () => {
  if (!activeWorkout.isActive) {
    await activeWorkout.resumeWorkout()

    if (!activeWorkout.isActive) {
      router.replace('/')
    }
  }
})

async function handleFinish() {
  try {
    await activeWorkout.finishWorkout()
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
          :disabled="activeWorkout.completedSetsCount === 0"
          @click="handleFinish"
        >
          <Check class="h-5 w-5 mr-2" />
          Finish Workout
        </Button>
      </div>
    </div>
  </AppLayout>
</template>
