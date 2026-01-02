<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-vue-next'

defineProps<{
  title?: string
  showBack?: boolean
}>()

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
    <div class="container max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
      <Button
        v-if="showBack"
        variant="ghost"
        size="icon"
        class="-ml-2"
        @click="goBack"
      >
        <ChevronLeft class="h-5 w-5" />
      </Button>

      <h1 class="font-semibold text-lg flex-1 truncate">
        {{ title || 'Workout Tracker' }}
      </h1>

      <slot name="actions" />
    </div>
  </header>
</template>
