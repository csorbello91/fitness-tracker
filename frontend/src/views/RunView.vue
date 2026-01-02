<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRuns, RUN_TYPES } from '@/composables/useRuns'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { RunType } from '@/composables/useRuns'
import type { Run } from '@/types/database'

type TerrainType = Run['terrain']

const route = useRoute()
const router = useRouter()
const {
  loading,
  createRun,
  updateRun,
  getRun,
  deleteRun,
  formatPace,
  calculatePace,
  formatDuration,
  parseDuration
} = useRuns()

const runId = computed(() => route.params.id as string | undefined)
const isNew = computed(() => !runId.value)

const runType = ref<RunType>('easy')
const distanceKm = ref<number | undefined>()
const durationInput = ref('')
const notes = ref('')
const terrain = ref<TerrainType>()
const saving = ref(false)
const loadingRun = ref(true)

const durationSeconds = computed(() => parseDuration(durationInput.value))

const pace = computed(() => {
  if (!distanceKm.value || !durationSeconds.value) return null
  const distanceMeters = distanceKm.value * 1000
  const paceSecondsPerKm = calculatePace(distanceMeters, durationSeconds.value)
  return formatPace(paceSecondsPerKm)
})

onMounted(async () => {
  if (!isNew.value) {
    try {
      const run = await getRun(runId.value!)
      runType.value = run.run_type as RunType
      distanceKm.value = run.distance_meters / 1000
      durationInput.value = formatDuration(run.duration_seconds)
      notes.value = run.notes || ''
      terrain.value = run.terrain || undefined
    } catch (error) {
      toast.error('Failed to load run')
      router.replace('/history')
    }
  }
  loadingRun.value = false
})

async function handleSave() {
  if (!distanceKm.value || distanceKm.value <= 0) {
    toast.error('Please enter a distance')
    return
  }

  if (!durationSeconds.value || durationSeconds.value <= 0) {
    toast.error('Please enter a duration')
    return
  }

  saving.value = true

  try {
    const runData = {
      run_type: runType.value,
      distance_meters: Math.round(distanceKm.value * 1000),
      duration_seconds: durationSeconds.value,
      notes: notes.value || null,
      terrain: terrain.value || null,
      started_at: new Date().toISOString()
    }

    if (isNew.value) {
      await createRun(runData)
      toast.success('Run logged!')
    } else {
      await updateRun(runId.value!, runData)
      toast.success('Run updated')
    }

    router.replace('/history')
  } catch (error) {
    toast.error('Failed to save run')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!runId.value) return

  try {
    await deleteRun(runId.value)
    toast.success('Run deleted')
    router.replace('/history')
  } catch (error) {
    toast.error('Failed to delete run')
  }
}

const terrainOptions = [
  { value: 'road', label: 'Road' },
  { value: 'trail', label: 'Trail' },
  { value: 'track', label: 'Track' },
  { value: 'treadmill', label: 'Treadmill' },
]
</script>

<template>
  <AppLayout :title="isNew ? 'Log Run' : 'Edit Run'" show-back>
    <template #header-actions>
      <AlertDialog v-if="!isNew">
        <AlertDialogTrigger as-child>
          <Button variant="ghost" size="icon">
            <Trash2 class="h-5 w-5 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this run. This cannot be undone.
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

    <div v-if="loadingRun && !isNew" class="space-y-4">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-20 w-full" />
    </div>

    <div v-else class="space-y-6">
      <!-- Run Type -->
      <div class="space-y-2">
        <Label>Run Type</Label>
        <Select v-model="runType">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="type in RUN_TYPES"
              :key="type.value"
              :value="type.value"
            >
              <div>
                <span class="font-medium">{{ type.label }}</span>
                <span class="text-muted-foreground ml-2 text-sm">{{ type.description }}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Distance & Duration -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="distance">Distance (km)</Label>
          <Input
            id="distance"
            v-model.number="distanceKm"
            type="number"
            inputmode="decimal"
            step="0.01"
            placeholder="5.00"
          />
        </div>

        <div class="space-y-2">
          <Label for="duration">Duration (mm:ss)</Label>
          <Input
            id="duration"
            v-model="durationInput"
            type="text"
            inputmode="numeric"
            placeholder="30:00"
          />
        </div>
      </div>

      <!-- Pace Display -->
      <Card v-if="pace">
        <CardContent class="py-4 text-center">
          <p class="text-sm text-muted-foreground">Average Pace</p>
          <p class="text-3xl font-bold">{{ pace }} <span class="text-lg font-normal text-muted-foreground">/km</span></p>
        </CardContent>
      </Card>

      <!-- Terrain -->
      <div class="space-y-2">
        <Label>Terrain (optional)</Label>
        <Select v-model="terrain">
          <SelectTrigger>
            <SelectValue placeholder="Select terrain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in terrainOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Notes -->
      <div class="space-y-2">
        <Label for="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          v-model="notes"
          placeholder="How did it feel? Weather conditions?"
          rows="3"
        />
      </div>

      <!-- Save Button -->
      <Button class="w-full h-12" :disabled="saving" @click="handleSave">
        <Save class="h-4 w-4 mr-2" />
        {{ saving ? 'Saving...' : isNew ? 'Log Run' : 'Update Run' }}
      </Button>
    </div>
  </AppLayout>
</template>
