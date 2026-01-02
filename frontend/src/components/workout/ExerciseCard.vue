<script setup lang="ts">
import { computed } from 'vue'
import { useActiveWorkoutStore } from '@/stores/activeWorkout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SetRow from './SetRow.vue'
import type { WorkoutExercise, WorkoutSet } from '@/types/database'

const props = defineProps<{
  workoutExercise: WorkoutExercise
}>()

const activeWorkout = useActiveWorkoutStore()

const sets = computed(() => activeWorkout.getSetsForExercise(props.workoutExercise.id))
const previousSets = computed(() => activeWorkout.getPreviousSetsForExercise(props.workoutExercise.id))

const completedCount = computed(() => sets.value.filter(s => s.is_completed).length)
const totalCount = computed(() => sets.value.length)
const isComplete = computed(() => completedCount.value === totalCount.value && totalCount.value > 0)

function getPreviousSet(setNumber: number): WorkoutSet | null {
  return previousSets.value.find(s => s.set_number === setNumber) || null
}

async function handleComplete(setId: string, weight: number, reps: number) {
  await activeWorkout.completeSet(props.workoutExercise.id, setId, weight, reps)
}

async function handleConfirmSame(setId: string) {
  await activeWorkout.confirmSameAsLast(props.workoutExercise.id, setId)
}
</script>

<template>
  <Card :class="{ 'border-green-500/50': isComplete }">
    <CardHeader class="pb-2">
      <div class="flex items-center justify-between">
        <CardTitle class="text-lg">{{ workoutExercise.exercise?.name }}</CardTitle>
        <Badge :variant="isComplete ? 'default' : 'secondary'">
          {{ completedCount }}/{{ totalCount }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="space-y-1">
        <SetRow
          v-for="set in sets"
          :key="set.id"
          :set="set"
          :previous-set="getPreviousSet(set.set_number)"
          @complete="(w, r) => handleComplete(set.id, w, r)"
          @confirm-same="handleConfirmSame(set.id)"
        />
      </div>
    </CardContent>
  </Card>
</template>
