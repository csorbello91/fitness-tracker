<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTemplates } from '@/composables/useTemplates'
import { useExercises, EXERCISE_CATEGORIES, EQUIPMENT_OPTIONS, MUSCLE_GROUPS } from '@/composables/useExercises'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, GripVertical, Save, ChevronLeft } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { TemplateExercise, Exercise } from '@/types/database'

const route = useRoute()
const router = useRouter()
const {
  fetchTemplateWithExercises,
  createTemplate,
  updateTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate
} = useTemplates()
const { exercises, fetchExercises, groupByCategory, createExercise } = useExercises()

const templateId = computed(() => route.params.id as string | undefined)
const isNew = computed(() => !templateId.value || templateId.value === 'new')

const name = ref('')
const description = ref('')
const templateExercises = ref<TemplateExercise[]>([])
const loading = ref(true)
const saving = ref(false)
const showExercisePicker = ref(false)
const showNewExerciseForm = ref(false)

// New exercise form
const newExerciseName = ref('')
const newExerciseCategory = ref<Exercise['category']>('compound')
const newExerciseEquipment = ref<string | undefined>()
const newExerciseDescription = ref('')
const newExerciseMuscleGroups = ref<string[]>([])
const creatingExercise = ref(false)

onMounted(async () => {
  await fetchExercises()

  if (!isNew.value) {
    try {
      const template = await fetchTemplateWithExercises(templateId.value!)
      name.value = template.name
      description.value = template.description || ''
      templateExercises.value = template.template_exercises || []
    } catch (error) {
      toast.error('Failed to load template')
      router.replace('/templates')
    }
  }

  loading.value = false
})

async function handleSave() {
  if (!name.value.trim()) {
    toast.error('Please enter a template name')
    return
  }

  saving.value = true

  try {
    if (isNew.value) {
      const newTemplate = await createTemplate(name.value, description.value)

      // Add exercises
      for (let i = 0; i < templateExercises.value.length; i++) {
        const te = templateExercises.value[i]
        if (!te) continue
        await addExerciseToTemplate(
          newTemplate.id,
          te.exercise_id,
          i,
          {
            sets: te.default_sets,
            reps: te.default_reps,
            weight: te.default_weight || undefined
          }
        )
      }

      toast.success('Template created')
    } else {
      await updateTemplate(templateId.value!, {
        name: name.value,
        description: description.value || null
      })
      toast.success('Template saved')
    }

    router.replace('/templates')
  } catch (error) {
    toast.error('Failed to save template')
  } finally {
    saving.value = false
  }
}

function handleAddExercise(exercise: Exercise) {
  const newExercise: TemplateExercise = {
    id: crypto.randomUUID(),
    template_id: templateId.value || '',
    exercise_id: exercise.id,
    order_index: templateExercises.value.length,
    default_sets: 5,
    default_reps: 5,
    default_weight: null,
    rest_seconds: 180,
    notes: null,
    created_at: new Date().toISOString(),
    exercise
  }

  templateExercises.value.push(newExercise)
  showExercisePicker.value = false

  // If editing existing template, add to DB
  if (!isNew.value) {
    addExerciseToTemplate(
      templateId.value!,
      exercise.id,
      templateExercises.value.length - 1
    ).catch(() => {
      // Rollback on error
      templateExercises.value.pop()
      toast.error('Failed to add exercise')
    })
  }
}

async function handleRemoveExercise(te: TemplateExercise) {
  const index = templateExercises.value.findIndex(e => e.id === te.id)
  if (index === -1) return

  templateExercises.value.splice(index, 1)

  // If editing existing template, remove from DB
  if (!isNew.value && te.id) {
    try {
      await removeExerciseFromTemplate(te.id)
    } catch (error) {
      toast.error('Failed to remove exercise')
    }
  }
}

function updateExerciseDefaults(te: TemplateExercise, field: 'sets' | 'reps' | 'weight', value: number) {
  const index = templateExercises.value.findIndex(e => e.id === te.id)
  if (index === -1) return

  const exercise = templateExercises.value[index]
  if (!exercise) return

  if (field === 'sets') {
    exercise.default_sets = value
  } else if (field === 'reps') {
    exercise.default_reps = value
  } else if (field === 'weight') {
    exercise.default_weight = value
  }
}

const groupedExercises = computed(() => groupByCategory(exercises.value))

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    compound: 'Compound',
    isolation: 'Isolation',
    bodyweight: 'Bodyweight'
  }
  return labels[category] || category
}

function openNewExerciseForm() {
  showNewExerciseForm.value = true
}

function closeNewExerciseForm() {
  showNewExerciseForm.value = false
  resetNewExerciseForm()
}

function resetNewExerciseForm() {
  newExerciseName.value = ''
  newExerciseCategory.value = 'compound'
  newExerciseEquipment.value = undefined
  newExerciseDescription.value = ''
  newExerciseMuscleGroups.value = []
}

function toggleMuscleGroup(group: string) {
  const index = newExerciseMuscleGroups.value.indexOf(group)
  if (index === -1) {
    newExerciseMuscleGroups.value.push(group)
  } else {
    newExerciseMuscleGroups.value.splice(index, 1)
  }
}

async function handleCreateExercise() {
  if (!newExerciseName.value.trim()) {
    toast.error('Please enter an exercise name')
    return
  }

  if (newExerciseMuscleGroups.value.length === 0) {
    toast.error('Please select at least one muscle group')
    return
  }

  creatingExercise.value = true

  try {
    const exercise = await createExercise({
      name: newExerciseName.value.trim(),
      category: newExerciseCategory.value,
      muscle_groups: newExerciseMuscleGroups.value,
      equipment: newExerciseEquipment.value || null,
      description: newExerciseDescription.value.trim() || null
    })

    // Refresh exercises list
    await fetchExercises()

    // Add to template
    handleAddExercise(exercise)

    toast.success('Exercise created and added!')
    closeNewExerciseForm()
  } catch (error) {
    toast.error('Failed to create exercise')
  } finally {
    creatingExercise.value = false
  }
}

function formatMuscleGroup(group: string): string {
  return group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>

<template>
  <AppLayout :title="isNew ? 'New Template' : 'Edit Template'" show-back>
    <template #header-actions>
      <Button size="sm" :disabled="saving" @click="handleSave">
        <Save class="h-4 w-4 mr-1" />
        {{ saving ? 'Saving...' : 'Save' }}
      </Button>
    </template>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-32 w-full" />
    </div>

    <div v-else class="space-y-6">
      <!-- Name & Description -->
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="name">Template Name</Label>
          <Input
            id="name"
            v-model="name"
            placeholder="e.g., Push Day, Leg Day"
          />
        </div>

        <div class="space-y-2">
          <Label for="description">Description (optional)</Label>
          <Textarea
            id="description"
            v-model="description"
            placeholder="Brief description of this workout"
            rows="2"
          />
        </div>
      </div>

      <!-- Exercises -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Exercises
          </h2>
          <Button size="sm" variant="outline" @click="showExercisePicker = true">
            <Plus class="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div v-if="templateExercises.length === 0" class="text-center py-8 text-muted-foreground">
          <p>No exercises yet</p>
          <p class="text-sm">Add exercises to build your template</p>
        </div>

        <div v-else class="space-y-2">
          <Card v-for="te in templateExercises" :key="te.id">
            <CardContent class="p-4">
              <div class="flex items-start gap-3">
                <div class="pt-2 text-muted-foreground cursor-grab">
                  <GripVertical class="h-5 w-5" />
                </div>

                <div class="flex-1 space-y-3">
                  <div class="flex items-center justify-between">
                    <p class="font-medium">{{ te.exercise?.name }}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click="handleRemoveExercise(te)"
                    >
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <Label class="text-xs">Sets</Label>
                      <Input
                        :model-value="te.default_sets"
                        type="number"
                        inputmode="numeric"
                        class="h-9"
                        @update:model-value="v => updateExerciseDefaults(te, 'sets', Number(v))"
                      />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-xs">Reps</Label>
                      <Input
                        :model-value="te.default_reps"
                        type="number"
                        inputmode="numeric"
                        class="h-9"
                        @update:model-value="v => updateExerciseDefaults(te, 'reps', Number(v))"
                      />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-xs">Weight (kg)</Label>
                      <Input
                        :model-value="te.default_weight || ''"
                        type="number"
                        inputmode="decimal"
                        step="0.5"
                        placeholder="-"
                        class="h-9"
                        @update:model-value="v => updateExerciseDefaults(te, 'weight', Number(v))"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- Exercise Picker Sheet -->
    <Sheet v-model:open="showExercisePicker">
      <SheetContent side="bottom" class="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
          <SheetDescription>
            Choose an exercise or create a new one
          </SheetDescription>
        </SheetHeader>

        <!-- Create New Exercise Button -->
        <Button
          class="w-full mt-4"
          variant="outline"
          @click="openNewExerciseForm"
        >
          <Plus class="h-4 w-4 mr-2" />
          Create New Exercise
        </Button>

        <ScrollArea class="h-[calc(100%-8rem)] mt-4">
          <div class="space-y-6 pb-8">
            <div v-for="(categoryExercises, category) in groupedExercises" :key="category">
              <h3 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                {{ getCategoryLabel(category) }}
              </h3>

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

              <Separator class="mt-4" />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    <!-- New Exercise Form Sheet -->
    <Sheet v-model:open="showNewExerciseForm">
      <SheetContent side="bottom" class="h-[90vh]">
        <SheetHeader>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" class="-ml-2" @click="closeNewExerciseForm">
              <ChevronLeft class="h-5 w-5" />
            </Button>
            <div>
              <SheetTitle>New Exercise</SheetTitle>
              <SheetDescription>
                Create a custom exercise
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea class="h-[calc(100%-8rem)] mt-4">
          <div class="space-y-6 pb-8 pr-2">
            <!-- Exercise Name -->
            <div class="space-y-2">
              <Label for="exercise-name">Exercise Name *</Label>
              <Input
                id="exercise-name"
                v-model="newExerciseName"
                placeholder="e.g., Incline Dumbbell Curl"
              />
            </div>

            <!-- Category -->
            <div class="space-y-2">
              <Label>Category *</Label>
              <Select v-model="newExerciseCategory">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="cat in EXERCISE_CATEGORIES"
                    :key="cat.value"
                    :value="cat.value"
                  >
                    {{ cat.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Equipment -->
            <div class="space-y-2">
              <Label>Equipment</Label>
              <Select v-model="newExerciseEquipment">
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="equip in EQUIPMENT_OPTIONS"
                    :key="equip.value"
                    :value="equip.value"
                  >
                    {{ equip.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Muscle Groups -->
            <div class="space-y-2">
              <Label>Muscle Groups *</Label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="group in MUSCLE_GROUPS"
                  :key="group"
                  class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                  :class="{ 'border-primary bg-primary/5': newExerciseMuscleGroups.includes(group) }"
                >
                  <Checkbox
                    :checked="newExerciseMuscleGroups.includes(group)"
                    @update:checked="toggleMuscleGroup(group)"
                  />
                  <span class="text-sm">{{ formatMuscleGroup(group) }}</span>
                </label>
              </div>
            </div>

            <!-- Description -->
            <div class="space-y-2">
              <Label for="exercise-desc">Description (optional)</Label>
              <Textarea
                id="exercise-desc"
                v-model="newExerciseDescription"
                placeholder="How to perform this exercise"
                rows="3"
              />
            </div>
          </div>
        </ScrollArea>

        <!-- Create Button -->
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            class="w-full"
            :disabled="creatingExercise || !newExerciseName.trim() || newExerciseMuscleGroups.length === 0"
            @click="handleCreateExercise"
          >
            {{ creatingExercise ? 'Creating...' : 'Create & Add to Template' }}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  </AppLayout>
</template>
