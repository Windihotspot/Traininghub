
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/composables/useAuth'

interface Organisation {
  id: string
  name: string
  slug: string
  logo_url?: string | null
}

interface OrganisationMembership {
  organisation_id: string
  role: string
  organisation: Organisation | null
}

export const useAuthStore = defineStore('auth', () => {
  const auth = useAuth()

  const memberships = ref<OrganisationMembership[]>([])
  const platformRole = ref<string | null>(null)
  const activeOrganisationId = ref<string | null>(null)
  const loadingContext = ref(false)
  const contextLoaded = ref(false)
  const authError = ref<string | null>(null)

  let loadPromise: Promise<void> | null = null

  const user = computed<User | null>(() => auth.user.value)
  const session = computed(() => auth.session.value)
  const ready = computed(() => auth.ready.value)
  const isAuthenticated = computed(() => !!user.value)

  const activeMembership = computed(
    () =>
      memberships.value.find(
        (membership) =>
          membership.organisation_id === activeOrganisationId.value,
      ) ?? null,
  )

  const organisation = computed(
    () => activeMembership.value?.organisation ?? null,
  )

  const organisationRole = computed(
    () => activeMembership.value?.role ?? null,
  )

  const userRoles = computed(() => {
    const roles: string[] = []

    if (platformRole.value) roles.push(platformRole.value)

    for (const membership of memberships.value) {
      if (!roles.includes(membership.role)) {
        roles.push(membership.role)
      }
    }

    return roles
  })

  async function loadUserContext(force = false): Promise<void> {
    if (loadPromise && !force) return loadPromise

    loadPromise = (async () => {
      loadingContext.value = true
      authError.value = null

      try {
        // Wait for the existing composable to resolve the initial session.
        if (!ready.value) {
          await new Promise<void>((resolve) => {
            const stop = watchReady(resolve)
            if (ready.value) {
              stop()
              resolve()
            }
          })
        }

        const currentUser = user.value

        if (!currentUser) {
          clearUserContext()
          contextLoaded.value = true
          return
        }

        const [membershipResult, profileResult] = await Promise.all([
          supabase
            .from('organisation_members')
            .select(`
              organisation_id,
              role,
              organisation:organisations (
                id,
                name,
                slug,
                logo_url
              )
            `)
            .eq('user_id', currentUser.id),

          supabase
            .from('profiles')
            .select('platform_role')
            .eq('id', currentUser.id)
            .maybeSingle(),
        ])

        if (membershipResult.error) throw membershipResult.error
        if (profileResult.error) throw profileResult.error

        // Avoid applying results if the user changed during the requests.
        if (user.value?.id !== currentUser.id) return

        memberships.value = (membershipResult.data ?? []) as unknown as OrganisationMembership[]
        platformRole.value = profileResult.data?.platform_role ?? null

        const stillMember = memberships.value.some(
          (membership) =>
            membership.organisation_id === activeOrganisationId.value,
        )

        if (!stillMember) {
          activeOrganisationId.value =
            memberships.value[0]?.organisation_id ?? null
        }

        contextLoaded.value = true
      } catch (error) {
        console.error('Failed to load auth context:', error)
        authError.value =
          error instanceof Error
            ? error.message
            : 'Failed to load user context'
        contextLoaded.value = false
      } finally {
        loadingContext.value = false
      }
    })()

    try {
      await loadPromise
    } finally {
      loadPromise = null
    }
  }

  // Small helper to wait for the composable's ready ref.
  function watchReady(onReady: () => void): () => void {
    const stop = watch(
      ready,
      (isReady) => {
        if (isReady) {
          stop()
          onReady()
        }
      },
      { immediate: true },
    )

    return stop
  }

  function clearUserContext() {
    memberships.value = []
    platformRole.value = null
    activeOrganisationId.value = null
    authError.value = null
  }

  function setActiveOrganisation(organisationId: string) {
    const isMember = memberships.value.some(
      (membership) => membership.organisation_id === organisationId,
    )

    if (!isMember) {
      throw new Error('You are not a member of this organisation')
    }

    activeOrganisationId.value = organisationId
  }

  async function signOut() {
    await auth.signOut()
    clearUserContext()
    contextLoaded.value = false
  }
  async function signIn(email: string, password: string) {
  await auth.signIn(email, password)
}

async function signUp(
  email: string,
  password: string,
  fullName: string,
) {
  return await auth.signUp(email, password, fullName)
}

async function sendReset(email: string) {
  await auth.sendReset(email)
}

async function updatePassword(password: string) {
  await auth.updatePassword(password)
}

  return {
    session,
    user,
    ready,
    isAuthenticated,
    memberships,
    platformRole,
    activeOrganisationId,
    activeMembership,
    organisation,
    organisationRole,
    userRoles,
    loadingContext,
    contextLoaded,
    authError,
    loadUserContext,
    setActiveOrganisation,
   signIn,
signUp,
sendReset,
updatePassword,
    signOut,
  }
})
