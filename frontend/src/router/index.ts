import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workout',
    name: 'workout',
    component: () => import('@/views/WorkoutView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workout/:id',
    name: 'workout-detail',
    component: () => import('@/views/WorkoutDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/HistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/templates',
    name: 'templates',
    component: () => import('@/views/TemplatesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/templates/new',
    name: 'template-new',
    component: () => import('@/views/TemplateEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/templates/:id',
    name: 'template-edit',
    component: () => import('@/views/TemplateEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/run',
    name: 'run',
    component: () => import('@/views/RunView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/run/:id',
    name: 'run-detail',
    component: () => import('@/views/RunView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize on first load
  if (authStore.loading) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
