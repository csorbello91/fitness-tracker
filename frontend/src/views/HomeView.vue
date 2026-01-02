<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveWorkoutStore } from '@/stores/activeWorkout'
import { useTemplates } from '@/composables/useTemplates'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Timer, ChevronRight } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { WorkoutTemplate } from '@/types/database'

const router = useRouter()
const activeWorkout = useActiveWorkoutStore()
const { templates, loading, fetchTemplates } = useTemplates()

const showTemplateSelector = ref(false)
const startingWorkout = ref(false)

onMounted(async () => {
  await fetchTemplates()
  // Check for in-progress workout
  await activeWorkout.resumeWorkout()

  if (activeWorkout.isActive) {
    // Resume existing workout
    router.push('/workout')
  }
})

async function handleSelectTemplate(template: WorkoutTemplate) {
  startingWorkout.value = true
  showTemplateSelector.value = false

  try {
    await activeWorkout.startWorkoutFromTemplate(template.id)
    router.push('/workout')
  } catch (error) {
    toast.error('Failed to start workout')
    console.error(error)
  } finally {
    startingWorkout.value = false
  }
}

function handleLogRun() {
  router.push('/run')
}
</script>

<template>
  <AppLayout title="Workout Tracker">
    <div class="space-y-6">
      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          class="h-24 flex-col gap-2"
          :disabled="startingWorkout"
          @click="showTemplateSelector = true"
        >
          <Dumbbell class="h-6 w-6" />
          <span>Start Workout</span>
        </Button>

        <Button
          size="lg"
          variant="outline"
          class="h-24 flex-col gap-2"
          @click="handleLogRun"
        >
          <Timer class="h-6 w-6" />
          <span>Log Run</span>
        </Button>
      </div>

      <!-- Recent Templates -->
      <div class="space-y-3">
        <h2 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Quick Start
        </h2>

        <div v-if="loading" class="space-y-2">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>

        <div v-else class="space-y-2">
          <Card
            v-for="template in templates.slice(0, 4)"
            :key="template.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="handleSelectTemplate(template)"
          >
            <CardContent class="p-4 flex items-center justify-between">
              <div>
                <p class="font-medium">{{ template.name }}</p>
                <p v-if="template.description" class="text-sm text-muted-foreground">
                  {{ template.description }}
                </p>
              </div>
              <ChevronRight class="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card
            v-if="templates.length === 0"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="router.push('/templates/new')"
          >
            <CardContent class="p-4 text-center text-muted-foreground">
              <p>No templates yet</p>
              <p class="text-sm">Tap to create your first workout template</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- Template Selector Sheet -->
    <Sheet v-model:open="showTemplateSelector">
      <SheetContent side="bottom" class="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Choose Workout</SheetTitle>
          <SheetDescription>
            Select a template to start your workout
          </SheetDescription>
        </SheetHeader>

        <div class="mt-4 space-y-2 overflow-y-auto max-h-[50vh]">
          <Card
            v-for="template in templates"
            :key="template.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="handleSelectTemplate(template)"
          >
            <CardContent class="p-4 flex items-center justify-between">
              <div>
                <p class="font-medium">{{ template.name }}</p>
                <p v-if="template.description" class="text-sm text-muted-foreground">
                  {{ template.description }}
                </p>
                <p v-if="template.is_system" class="text-xs text-primary mt-1">
                  StrongLifts 5x5
                </p>
              </div>
              <ChevronRight class="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  </AppLayout>
</template>
