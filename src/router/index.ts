
import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'
import { trainingHubRoutes } from '@/router/traininghub.routes'
import { trainingHubGuard } from '@/router/guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingPage,
    },
    {
  path: '/organisations/register',
  name: 'organisation-register',
  component: () => import('@/views/OrganisationRegistrationView.vue'),
  meta: { requiresAuth: false },
},
    ...trainingHubRoutes,
  ],
})

// Register the navigation guard
router.beforeEach(trainingHubGuard)

export default router
