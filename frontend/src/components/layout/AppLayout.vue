<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'

defineProps<{
  title?: string
  showBack?: boolean
}>()
</script>

<template>
  <div class="min-h-screen flex flex-col pb-16">
    <AppHeader :title="title" :show-back="showBack">
      <template #actions>
        <slot name="header-actions" />
      </template>
    </AppHeader>

    <main class="flex-1 container max-w-lg mx-auto px-4 py-4">
      <slot />
    </main>

    <AppNav />
  </div>
</template>
