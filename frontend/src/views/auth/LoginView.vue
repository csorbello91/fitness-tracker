<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!email.value || !password.value) {
    toast.error('Please fill in all fields')
    return
  }

  loading.value = true

  try {
    await authStore.signIn(email.value, password.value)
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
    toast.success('Welcome back!')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sign in'
    toast.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">Workout Tracker</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Your password"
              autocomplete="current-password"
              required
            />
          </div>

          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </Button>
        </form>

        <div class="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?
          <RouterLink to="/register" class="text-primary underline-offset-4 hover:underline">
            Sign up
          </RouterLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
