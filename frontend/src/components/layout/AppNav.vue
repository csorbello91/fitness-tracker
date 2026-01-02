<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Home, History, LayoutTemplate, Settings } from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/templates', icon: LayoutTemplate, label: 'Templates' },
]

function isActive(path: string) {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
    <div class="container max-w-lg mx-auto px-4">
      <div class="flex items-center justify-around h-16">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
