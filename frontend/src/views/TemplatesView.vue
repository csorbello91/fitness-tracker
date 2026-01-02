<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTemplates } from '@/composables/useTemplates'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Plus, ChevronRight, Trash2, Lock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { WorkoutTemplate } from '@/types/database'

const router = useRouter()
const { templates, loading, fetchTemplates, deleteTemplate } = useTemplates()

onMounted(() => {
  fetchTemplates()
})

function handleEdit(template: WorkoutTemplate) {
  if (template.is_system) {
    toast.info('System templates cannot be edited')
    return
  }
  router.push(`/templates/${template.id}`)
}

async function handleDelete(template: WorkoutTemplate) {
  try {
    await deleteTemplate(template.id)
    await fetchTemplates()
    toast.success('Template deleted')
  } catch (error) {
    toast.error('Failed to delete template')
  }
}
</script>

<template>
  <AppLayout title="Templates">
    <template #header-actions>
      <Button size="icon" variant="ghost" @click="router.push('/templates/new')">
        <Plus class="h-5 w-5" />
      </Button>
    </template>

    <div class="space-y-6">
      <!-- System Templates -->
      <div v-if="templates.some(t => t.is_system)" class="space-y-3">
        <h2 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          StrongLifts 5x5
        </h2>

        <div class="space-y-2">
          <Card
            v-for="template in templates.filter(t => t.is_system)"
            :key="template.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="handleEdit(template)"
          >
            <CardContent class="p-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div>
                  <p class="font-medium">{{ template.name }}</p>
                  <p v-if="template.description" class="text-sm text-muted-foreground">
                    {{ template.description }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Lock class="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- User Templates -->
      <div class="space-y-3">
        <h2 class="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          My Templates
        </h2>

        <div v-if="loading" class="space-y-2">
          <Skeleton class="h-16 w-full" />
          <Skeleton class="h-16 w-full" />
        </div>

        <div v-else-if="templates.filter(t => !t.is_system).length === 0" class="space-y-2">
          <Card
            class="cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
            @click="router.push('/templates/new')"
          >
            <CardContent class="p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Plus class="h-5 w-5" />
              <span>Create your first template</span>
            </CardContent>
          </Card>
        </div>

        <div v-else class="space-y-2">
          <Card
            v-for="template in templates.filter(t => !t.is_system)"
            :key="template.id"
            class="cursor-pointer hover:bg-muted/50 transition-colors"
            @click="handleEdit(template)"
          >
            <CardContent class="p-4 flex items-center justify-between">
              <div>
                <p class="font-medium">{{ template.name }}</p>
                <p v-if="template.description" class="text-sm text-muted-foreground">
                  {{ template.description }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click.stop
                    >
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{{ template.name }}". This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        @click="handleDelete(template)"
                        class="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <ChevronRight class="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
