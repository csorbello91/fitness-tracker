<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { WorkoutSet } from '@/types/database'

const props = defineProps<{
  set: WorkoutSet
  previousSet?: WorkoutSet | null
}>()

const emit = defineEmits<{
  complete: [weight: number, reps: number]
  confirmSame: []
}>()

const isEditing = ref(false)
const editWeight = ref(props.set.target_weight || 0)
const editReps = ref(props.set.target_reps || 0)

const displayWeight = computed(() => props.set.target_weight || 0)
const displayReps = computed(() => props.set.target_reps || 0)

const hasPreviousData = computed(() => {
  return props.previousSet && props.previousSet.actual_weight
})

const isImproved = computed(() => {
  if (!props.previousSet?.actual_weight) return false
  return (props.set.target_weight || 0) > props.previousSet.actual_weight
})

function handleQuickConfirm() {
  emit('confirmSame')
}

function handleEdit() {
  editWeight.value = displayWeight.value
  editReps.value = displayReps.value
  isEditing.value = true
}

function handleSave() {
  emit('complete', editWeight.value, editReps.value)
  isEditing.value = false
}

function handleCancel() {
  isEditing.value = false
}
</script>

<template>
  <div
    class="flex items-center gap-2 py-3 px-2 rounded-lg transition-colors"
    :class="{
      'bg-muted/30': !set.is_completed && !isEditing,
      'bg-green-500/10': set.is_completed,
      'bg-primary/5': isEditing
    }"
  >
    <!-- Set Number -->
    <span class="w-8 text-center font-medium text-muted-foreground">
      {{ set.set_number }}
    </span>

    <!-- Completed State -->
    <template v-if="set.is_completed">
      <div class="flex-1 flex items-center gap-2">
        <span class="font-medium">{{ set.actual_weight }} kg</span>
        <span class="text-muted-foreground">x</span>
        <span class="font-medium">{{ set.actual_reps }}</span>
      </div>
      <Check class="h-5 w-5 text-green-500" />
    </template>

    <!-- Edit Mode -->
    <template v-else-if="isEditing">
      <div class="flex-1 flex items-center gap-2">
        <Input
          v-model.number="editWeight"
          type="number"
          inputmode="decimal"
          step="0.5"
          class="w-20 h-10 text-center"
          @keyup.enter="handleSave"
        />
        <span class="text-muted-foreground">kg x</span>
        <Input
          v-model.number="editReps"
          type="number"
          inputmode="numeric"
          class="w-16 h-10 text-center"
          @keyup.enter="handleSave"
        />
      </div>
      <Button size="sm" @click="handleSave">
        <Check class="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" @click="handleCancel">
        Cancel
      </Button>
    </template>

    <!-- Quick Mode -->
    <template v-else>
      <div class="flex-1 flex items-center gap-2">
        <span class="font-medium">{{ displayWeight }} kg</span>
        <span class="text-muted-foreground">x</span>
        <span class="font-medium">{{ displayReps }}</span>

        <Badge v-if="isImproved" variant="secondary" class="ml-2 text-xs">
          +{{ ((set.target_weight || 0) - (previousSet?.actual_weight || 0)).toFixed(1) }}
        </Badge>
        <span
          v-else-if="hasPreviousData"
          class="text-xs text-muted-foreground ml-2"
        >
          last time
        </span>
      </div>

      <!-- One-click confirm -->
      <Button
        size="icon"
        class="h-10 w-10"
        @click="handleQuickConfirm"
      >
        <Check class="h-5 w-5" />
      </Button>

      <!-- Edit button -->
      <Button
        size="icon"
        variant="ghost"
        class="h-10 w-10"
        @click="handleEdit"
      >
        <Pencil class="h-4 w-4" />
      </Button>
    </template>
  </div>
</template>
