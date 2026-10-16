import type { NavigationGuard } from 'vue-router'
import { supabase } from '@/services/supabase'

// Only same-site paths - never follow an arbitrary ?redirect= to another origin.
export const safeRedirect = (v: unknown): string | null =>
  typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : null

export const trainingHubGuard: NavigationGuard = async (to) => {
  // getSession() also waits for supabase-js to finish reading invite/recovery tokens from the URL
  const { data } = await supabase.auth.getSession()
  const signedIn = !!data.session

  if (to.meta.requiresAuth && !signedIn) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'login' && signedIn) return safeRedirect(to.query.redirect) ?? { name: 'dashboard' }
  return true
}
