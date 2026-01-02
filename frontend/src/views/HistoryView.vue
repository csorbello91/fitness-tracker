<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistory } from '@/composables/useHistory'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Timer, ChevronRight, Calendar } from 'lucide-vue-next'

const router = useRouter()
const {
  workouts,
  runs,
  loading,
  fetchWorkouts,
  fetchRuns,
  formatVolume,
  formatDistance,
  formatPace,
  formatDuration
} = useHistory()

onMounted(async () => {
  await Promise.all([fetchWorkouts(), fetchRuns()])
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function getWorkoutDuration(workout: { started_at: string; completed_at: string | null }): string {
  if (!workout.completed_at) return '-'

  const start = new Date(workout.started_at)
  const end = new Date(workout.completed_at)
  const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

  return formatDuration(diffSeconds)
}

function getRunTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    easy: 'Easy',
    tempo: 'Tempo',
    speed: 'Speed',
    intervals: 'Intervals',
    long: 'Long Run',
    recovery: 'Recovery',
    race: 'Race'
  }
  return labels[type] || type
}
</script>

<template>
  <AppLayout title="History">
    <Tabs default-value="lifting" class="w-full">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="lifting">
          <Dumbbell class="h-4 w-4 mr-2" />
          Lifting
        </TabsTrigger>
        <TabsTrigger value="running">
          <Timer class="h-4 w-4 mr-2" />
          Running
        </TabsTrigger>
      </TabsList>

      <!-- Lifting History -->
      <TabsContent value="lifting" class="mt-4">
        <div v-if="loading" class="space-y-3">
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>

        <div v-else-if="workouts.length === 0" class="text-center py-12 text-muted-foreground">
          <Dumbbell class="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No workouts yet</p>
          <p class="text-sm">Start a workout to see your history</p>
        </div>

        <div v-else class="space-y-3">
          <Card
            v-for="workout in workouts"
            :key="workout.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="router.push(`/workout/${workout.id}`)"
          >
            <CardContent class="p-4">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <p class="font-medium">{{ workout.name }}</p>
                  <div class="flex items-center gap-3 text-sm text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {{ formatDate(workout.completed_at || workout.started_at) }}
                    </span>
                    <span>{{ getWorkoutDuration(workout) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Badge variant="secondary">
                    {{ formatVolume(workout.total_volume) }}
                  </Badge>
                  <ChevronRight class="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Running History -->
      <TabsContent value="running" class="mt-4">
        <div v-if="loading" class="space-y-3">
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>

        <div v-else-if="runs.length === 0" class="text-center py-12 text-muted-foreground">
          <Timer class="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No runs yet</p>
          <p class="text-sm">Log a run to see your history</p>
        </div>

        <div v-else class="space-y-3">
          <Card
            v-for="run in runs"
            :key="run.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="router.push(`/run/${run.id}`)"
          >
            <CardContent class="p-4">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium">{{ formatDistance(run.distance_meters) }}</p>
                    <Badge variant="outline" class="text-xs">
                      {{ getRunTypeLabel(run.run_type) }}
                    </Badge>
                  </div>
                  <div class="flex items-center gap-3 text-sm text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {{ formatDate(run.started_at) }}
                    </span>
                    <span>{{ formatDuration(run.duration_seconds) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium">
                    {{ run.pace_seconds_per_km ? formatPace(run.pace_seconds_per_km) : '-' }}
                  </span>
                  <ChevronRight class="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </AppLayout>
</template>
