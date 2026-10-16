import type { RouteRecordRaw } from 'vue-router'

// Spread into your router: routes: [...existing, ...trainingHubRoutes]
// and register: router.beforeEach(trainingHubGuard)
export const trainingHubRoutes: RouteRecordRaw[] = [
  // auth
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  { path: '/set-password', name: 'set-password', component: () => import('@/views/SetPasswordView.vue') },

  // public (slug is unique per organisation only, so URLs carry the org slug)
  { path: '/trainings/:orgSlug/:slug', name: 'training-detail', component: () => import('@/views/TrainingDetailView.vue') },
  { path: '/trainings/:orgSlug/:slug/register', name: 'training-register', component: () => import('@/views/TrainingRegisterView.vue') },
  { path: '/registration/confirmation', name: 'registration-confirmation', component: () => import('@/components/traininghub/PaymentConfirmation.vue') },

  // organisation staff
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/OrgDashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard/trainings/new', name: 'training-new', component: () => import('@/views/TrainingEditorView.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard/trainings/:id/edit', name: 'training-edit', component: () => import('@/views/TrainingEditorView.vue'), meta: { requiresAuth: true } },

  // platform admins (view re-checks; edge function enforces)
  { path: '/admin/organisations', name: 'admin-organisations', component: () => import('@/views/AdminOrganisationsView.vue'), meta: { requiresAuth: true } },
]
